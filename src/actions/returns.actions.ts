"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { serializeDecimals } from "@/lib/serialize";
import { round2 } from "@/lib/money";
import { createReturnSchema, type CreateReturnInput } from "@/lib/validations/return.schema";

/** Busca ventas activas por número de ticket o nombre de cliente — cualquier rol de venta puede
 * buscar cualquier venta del negocio para procesar una devolución (no se restringe a "mis ventas"). */
export async function findSaleForReturn(query: string) {
  const session = requirePermission(await getCurrentSession(), "returns.create");
  const businessId = session.user.businessId;
  const trimmed = query.trim();
  if (!trimmed) return [];

  const asNumber = Number(trimmed.replace(/^\D*0*/, ""));
  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      status: "ACTIVE",
      OR: [
        ...(Number.isFinite(asNumber) && asNumber > 0 ? [{ ticketNumber: asNumber }] : []),
        { customer: { name: { contains: trimmed, mode: "insensitive" as const } } },
      ],
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return serializeDecimals(sales);
}

async function withReturnedQuantities(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true, customer: true, user: true },
  });
  if (!sale) return null;

  const returnItems = await prisma.returnItem.findMany({
    where: { saleItem: { saleId } },
    select: { saleItemId: true, quantity: true },
  });
  const returnedByItem = new Map<string, number>();
  for (const ri of returnItems) {
    returnedByItem.set(ri.saleItemId, (returnedByItem.get(ri.saleItemId) ?? 0) + ri.quantity);
  }

  return {
    sale,
    items: sale.items.map((item) => ({
      ...item,
      alreadyReturned: returnedByItem.get(item.id) ?? 0,
      returnable: item.quantity - (returnedByItem.get(item.id) ?? 0),
    })),
  };
}

export async function getSaleForReturn(saleId: string) {
  const session = requirePermission(await getCurrentSession(), "returns.create");
  const result = await withReturnedQuantities(saleId);
  if (!result || result.sale.businessId !== session.user.businessId) return null;
  return serializeDecimals(result);
}

export async function createReturn(input: CreateReturnInput) {
  const session = requirePermission(await getCurrentSession(), "returns.create");
  const data = createReturnSchema.parse(input);
  const businessId = session.user.businessId;

  const returnRecord = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: data.saleId, businessId } });
    if (!sale) throw new Error("Venta no encontrada");
    if (sale.status !== "ACTIVE") {
      throw new Error("No se puede devolver de una venta anulada");
    }

    const saleItems = await tx.saleItem.findMany({ where: { saleId: data.saleId } });
    const saleItemById = new Map(saleItems.map((i) => [i.id, i]));

    const existingReturnItems = await tx.returnItem.findMany({
      where: { saleItem: { saleId: data.saleId } },
      select: { saleItemId: true, quantity: true },
    });
    const alreadyReturned = new Map<string, number>();
    for (const ri of existingReturnItems) {
      alreadyReturned.set(ri.saleItemId, (alreadyReturned.get(ri.saleItemId) ?? 0) + ri.quantity);
    }

    let totalAmount = 0;
    const itemsToCreate: {
      saleItemId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const line of data.items) {
      const saleItem = saleItemById.get(line.saleItemId);
      if (!saleItem) throw new Error("Uno de los ítems no pertenece a esta venta");

      const returned = alreadyReturned.get(line.saleItemId) ?? 0;
      const returnable = saleItem.quantity - returned;
      if (line.quantity > returnable) {
        throw new Error(`Solo se puede devolver hasta ${returnable} unidad(es) de "${saleItem.productName}"`);
      }

      const unitPrice = Number(saleItem.unitPrice);
      const subtotal = round2(unitPrice * line.quantity);
      totalAmount = round2(totalAmount + subtotal);

      itemsToCreate.push({
        saleItemId: line.saleItemId,
        productId: saleItem.productId,
        quantity: line.quantity,
        unitPrice,
        subtotal,
      });

      const newStock = await tx.product.update({
        where: { id: saleItem.productId },
        data: { stock: { increment: line.quantity } },
        select: { stock: true },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId,
          productId: saleItem.productId,
          type: "DEVOLUCION",
          quantity: line.quantity,
          previousStock: newStock.stock - line.quantity,
          newStock: newStock.stock,
          reason: `Devolución de venta ${sale.ticketSeries}-${sale.ticketNumber}: ${data.reason}`,
          referenceType: "RETURN",
          referenceId: sale.id,
          userId: session.user.id,
        },
      });
    }

    const created = await tx.return.create({
      data: {
        businessId,
        saleId: sale.id,
        userId: session.user.id,
        reason: data.reason,
        totalAmount,
        items: { create: itemsToCreate },
      },
      include: { items: { include: { product: true } } },
    });

    await writeAuditLog(tx, {
      businessId,
      userId: session.user.id,
      action: "RETURN_CREATE",
      entityType: "Return",
      entityId: created.id,
      metadata: { saleId: sale.id, totalAmount },
    });

    return created;
  });

  revalidatePath("/devoluciones");
  revalidatePath(`/ventas/${data.saleId}`);
  revalidatePath("/productos");
  revalidatePath("/inventario");
  return serializeDecimals(returnRecord);
}

export async function listReturns() {
  const session = requirePermission(await getCurrentSession(), "returns.view");
  const returns = await prisma.return.findMany({
    where: { businessId: session.user.businessId },
    include: { sale: true, user: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return serializeDecimals(returns);
}

export async function getReturn(id: string) {
  const session = requirePermission(await getCurrentSession(), "returns.view");
  const ret = await prisma.return.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { sale: { include: { customer: true } }, user: true, items: { include: { product: true } } },
  });
  return serializeDecimals(ret);
}
