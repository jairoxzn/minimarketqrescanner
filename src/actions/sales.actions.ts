"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission, UnauthorizedError } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { serializeDecimals } from "@/lib/serialize";
import { round2, calcIgvFromTotal } from "@/lib/money";
import { createSaleSchema, type CreateSaleInput } from "@/lib/validations/sale.schema";

/**
 * Crea una venta de forma atómica: incrementa el contador de tickets,
 * descuenta stock (bloqueado si es insuficiente, salvo allowNegativeStock),
 * crea Sale + SaleItem + Payment + InventoryMovement + AuditLog.
 * Ver plan de implementación §5.1/§5.2 para el razonamiento de concurrencia.
 */
export async function createSale(input: CreateSaleInput) {
  const session = requirePermission(await getCurrentSession(), "pos.sell");
  const data = createSaleSchema.parse(input);
  const businessId = session.user.businessId;

  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });

  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId },
  });
  const productById = new Map(products.map((p) => [p.id, p]));
  for (const item of data.items) {
    if (!productById.has(item.productId)) {
      throw new Error("Uno de los productos ya no existe o no pertenece a este negocio");
    }
  }

  // El precio unitario SIEMPRE se toma del registro del producto en la base de
  // datos, nunca de lo que envía el cliente — evita manipulación de precios.
  const lines = data.items.map((item) => {
    const product = productById.get(item.productId)!;
    const unitPrice = Number(product.salePrice);
    const unitCost = Number(product.purchasePrice);
    const lineDiscount = round2(item.discount);
    const subtotal = round2(unitPrice * item.quantity - lineDiscount);
    return { ...item, product, unitPrice, unitCost, discount: lineDiscount, subtotal };
  });

  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const lineDiscounts = round2(lines.reduce((sum, l) => sum + l.discount, 0));
  const orderDiscount = round2(data.discount);
  const total = round2(subtotal - lineDiscounts - orderDiscount);
  if (total < 0) throw new Error("El descuento no puede ser mayor al subtotal");

  const paymentsTotal = round2(data.payments.reduce((sum, p) => sum + p.amount, 0));
  if (Math.abs(paymentsTotal - total) > 0.01) {
    throw new Error(`Los pagos (S/ ${paymentsTotal.toFixed(2)}) no coinciden con el total (S/ ${total.toFixed(2)})`);
  }

  const igvAmount = calcIgvFromTotal(total, Number(business.igvPercent), business.igvIncluded);
  const changeAmount =
    data.amountReceived !== undefined ? round2(data.amountReceived - total) : undefined;

  const customer = await prisma.customer.findFirst({ where: { id: data.customerId, businessId } });
  if (!customer) throw new Error("Cliente no encontrado");

  const sale = await prisma.$transaction(async (tx) => {
    const counter = await tx.ticketCounter.update({
      where: { businessId },
      data: { current: { increment: 1 } },
    });

    for (const line of lines) {
      const rows = await tx.$queryRaw<{ stock: number }[]>`
        UPDATE products
        SET stock = stock - ${line.quantity}
        WHERE id = ${line.productId}
          AND (stock >= ${line.quantity} OR ${business.allowNegativeStock})
        RETURNING stock
      `;
      if (rows.length === 0) {
        throw new Error(`Stock insuficiente para "${line.product.name}"`);
      }
      const newStock = rows[0].stock;

      await tx.inventoryMovement.create({
        data: {
          businessId,
          productId: line.productId,
          type: "SALIDA",
          quantity: line.quantity,
          previousStock: newStock + line.quantity,
          newStock,
          reason: "Venta",
          referenceType: "SALE",
          userId: session.user.id,
        },
      });
    }

    const created = await tx.sale.create({
      data: {
        businessId,
        ticketSeries: counter.series,
        ticketNumber: counter.current,
        customerId: data.customerId,
        userId: session.user.id,
        subtotal,
        discount: round2(lineDiscounts + orderDiscount),
        igvAmount,
        total,
        amountReceived: data.amountReceived,
        changeAmount,
        status: "ACTIVE",
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            productName: l.product.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            discount: l.discount,
            subtotal: l.subtotal,
          })),
        },
        payments: {
          create: data.payments.map((p) => ({
            paymentMethodId: p.paymentMethodId,
            amount: p.amount,
            reference: p.reference,
          })),
        },
      },
      include: { items: true, payments: { include: { paymentMethod: true } }, customer: true },
    });

    await writeAuditLog(tx, {
      businessId,
      userId: session.user.id,
      action: "SALE_CREATE",
      entityType: "Sale",
      entityId: created.id,
      metadata: { total, ticket: `${created.ticketSeries}-${created.ticketNumber}` },
    });

    return created;
  });

  revalidatePath("/pos");
  revalidatePath("/ventas");
  revalidatePath("/productos");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");

  return serializeDecimals(sale);
}

export interface SaleFilters {
  search?: string;
  userId?: string;
  customerId?: string;
  paymentMethodId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: "ACTIVE" | "VOID" | "all";
}

export async function listSales(filters: SaleFilters = {}) {
  const session = requirePermission(await getCurrentSession(), "sales.viewOwn");
  const businessId = session.user.businessId;
  const canViewAll = session.user.role === "ADMIN";

  const where: Prisma.SaleWhereInput = { businessId };
  if (!canViewAll) where.userId = session.user.id;
  if (filters.userId && canViewAll) where.userId = filters.userId;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.status && filters.status !== "all") where.status = filters.status;
  if (filters.paymentMethodId) {
    where.payments = { some: { paymentMethodId: filters.paymentMethodId } };
  }
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }
  if (filters.search) {
    const asNumber = Number(filters.search);
    where.OR = [
      ...(Number.isFinite(asNumber) && filters.search.trim() !== "" ? [{ ticketNumber: asNumber }] : []),
      { customer: { name: { contains: filters.search, mode: "insensitive" as const } } },
    ];
  }

  const sales = await prisma.sale.findMany({
    where,
    include: { customer: true, user: true, payments: { include: { paymentMethod: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return serializeDecimals(sales);
}

export async function getSale(id: string) {
  const session = requirePermission(await getCurrentSession(), "sales.viewOwn");
  const sale = await prisma.sale.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      customer: true,
      user: true,
      voidedBy: true,
      items: { include: { product: true } },
      payments: { include: { paymentMethod: true } },
      business: true,
    },
  });
  if (!sale) return null;
  if (session.user.role !== "ADMIN" && sale.userId !== session.user.id) {
    throw new UnauthorizedError("No puedes ver ventas de otros usuarios");
  }
  return serializeDecimals(sale);
}

/** Usado por la ruta de impresión de tickets — sin restricción de propietario, solo requiere sesión válida del mismo negocio. */
export async function getSaleForTicket(id: string) {
  const session = requirePermission(await getCurrentSession(), "sales.print");
  const sale = await prisma.sale.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      customer: true,
      user: true,
      items: true,
      payments: { include: { paymentMethod: true } },
      business: true,
    },
  });
  return serializeDecimals(sale);
}

/**
 * Anula una venta: revierte el stock de cada línea y marca la venta como VOID.
 * Idempotente (updateMany con guardia de status) y solo permitido para ADMIN.
 * Ver plan §5.3.
 */
export async function voidSale(id: string, reason: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new UnauthorizedError("No autenticado");
  if (session.user.role !== "ADMIN") throw new UnauthorizedError("Solo un administrador puede anular ventas");
  if (!reason.trim()) throw new Error("El motivo de anulación es obligatorio");

  const businessId = session.user.businessId;

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id, businessId },
      include: { items: true },
    });
    if (!sale) throw new Error("Venta no encontrada");

    const guarded = await tx.sale.updateMany({
      where: { id, status: "ACTIVE" },
      data: { status: "VOID", voidedAt: new Date(), voidedById: session.user.id, voidReason: reason },
    });
    if (guarded.count === 0) throw new Error("La venta ya fue anulada");

    for (const item of sale.items) {
      const rows = await tx.$queryRaw<{ stock: number }[]>`
        UPDATE products SET stock = stock + ${item.quantity}
        WHERE id = ${item.productId}
        RETURNING stock
      `;
      const newStock = rows[0].stock;
      await tx.inventoryMovement.create({
        data: {
          businessId,
          productId: item.productId,
          type: "ENTRADA",
          quantity: item.quantity,
          previousStock: newStock - item.quantity,
          newStock,
          reason: `Anulación de venta ${sale.ticketSeries}-${sale.ticketNumber}`,
          referenceType: "VOID",
          referenceId: sale.id,
          userId: session.user.id,
        },
      });
    }

    await writeAuditLog(tx, {
      businessId,
      userId: session.user.id,
      action: "SALE_VOID",
      entityType: "Sale",
      entityId: sale.id,
      metadata: { reason },
    });
  });

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/productos");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
}
