"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { round2 } from "@/lib/money";
import { createPurchaseSchema, type CreatePurchaseInput } from "@/lib/validations/purchase.schema";

export interface PurchaseFilters {
  status?: "PENDIENTE" | "RECIBIDA" | "CANCELADA" | "all";
}

export async function listPurchases(filters: PurchaseFilters = {}) {
  const session = requirePermission(await getCurrentSession(), "purchases.manage");
  const where: Prisma.PurchaseWhereInput = { businessId: session.user.businessId };
  if (filters.status && filters.status !== "all") where.status = filters.status;

  return prisma.purchase.findMany({
    where,
    include: { supplier: true, user: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getPurchase(id: string) {
  const session = requirePermission(await getCurrentSession(), "purchases.manage");
  return prisma.purchase.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      supplier: true,
      user: true,
      receivedBy: true,
      items: { include: { product: true } },
    },
  });
}

/** Aplica la recepción de una compra: repone stock (movimiento ENTRADA) y, opcionalmente,
 * actualiza el precio de compra del producto al último costo pagado. Se usa tanto al crear
 * una compra con "recibir ahora" como al recibir una compra pendiente después. */
async function applyReceipt(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    userId: string;
    purchaseId: string;
    supplierName: string;
    items: { productId: string; quantity: number; unitCost: number }[];
    updateProductPrices: boolean;
  }
) {
  for (const item of params.items) {
    const newStock = await tx.product.update({
      where: { id: item.productId },
      data: {
        stock: { increment: item.quantity },
        ...(params.updateProductPrices ? { purchasePrice: item.unitCost } : {}),
      },
      select: { stock: true },
    });

    await tx.inventoryMovement.create({
      data: {
        businessId: params.businessId,
        productId: item.productId,
        type: "ENTRADA",
        quantity: item.quantity,
        previousStock: newStock.stock - item.quantity,
        newStock: newStock.stock,
        reason: `Compra a ${params.supplierName}`,
        referenceType: "PURCHASE",
        referenceId: params.purchaseId,
        userId: params.userId,
      },
    });
  }
}

export async function createPurchase(input: CreatePurchaseInput) {
  const session = requirePermission(await getCurrentSession(), "purchases.manage");
  const data = createPurchaseSchema.parse(input);
  const businessId = session.user.businessId;

  const purchase = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({ where: { id: data.supplierId, businessId } });
    if (!supplier) throw new Error("Proveedor no encontrado");

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: productIds }, businessId } });
    if (products.length !== productIds.length) throw new Error("Uno de los productos no existe");

    const items = data.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitCost: i.unitCost,
      subtotal: round2(i.unitCost * i.quantity),
    }));
    const total = round2(items.reduce((sum, i) => sum + i.subtotal, 0));

    const created = await tx.purchase.create({
      data: {
        businessId,
        supplierId: data.supplierId,
        userId: session.user.id,
        status: data.receiveNow ? "RECIBIDA" : "PENDIENTE",
        invoiceNumber: data.invoiceNumber || null,
        notes: data.notes || null,
        total,
        receivedAt: data.receiveNow ? new Date() : null,
        receivedById: data.receiveNow ? session.user.id : null,
        items: { create: items },
      },
      include: { items: true },
    });

    if (data.receiveNow) {
      await applyReceipt(tx, {
        businessId,
        userId: session.user.id,
        purchaseId: created.id,
        supplierName: supplier.name,
        items,
        updateProductPrices: true,
      });
    }

    await writeAuditLog(tx, {
      businessId,
      userId: session.user.id,
      action: "PURCHASE_CREATE",
      entityType: "Purchase",
      entityId: created.id,
      metadata: { total, status: created.status },
    });

    return created;
  });

  revalidatePath("/compras");
  revalidatePath("/productos");
  revalidatePath("/inventario");
  return purchase;
}

export async function receivePurchase(id: string, updateProductPrices: boolean) {
  const session = requirePermission(await getCurrentSession(), "purchases.manage");
  const businessId = session.user.businessId;

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: { id, businessId },
      include: { items: true, supplier: true },
    });
    if (!purchase) throw new Error("Compra no encontrada");

    const guarded = await tx.purchase.updateMany({
      where: { id, status: "PENDIENTE" },
      data: { status: "RECIBIDA", receivedAt: new Date(), receivedById: session.user.id },
    });
    if (guarded.count === 0) throw new Error("La compra ya fue recibida o cancelada");

    await applyReceipt(tx, {
      businessId,
      userId: session.user.id,
      purchaseId: purchase.id,
      supplierName: purchase.supplier.name,
      items: purchase.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: Number(i.unitCost) })),
      updateProductPrices,
    });

    await writeAuditLog(tx, {
      businessId,
      userId: session.user.id,
      action: "PURCHASE_RECEIVE",
      entityType: "Purchase",
      entityId: purchase.id,
    });
  });

  revalidatePath("/compras");
  revalidatePath(`/compras/${id}`);
  revalidatePath("/productos");
  revalidatePath("/inventario");
}

export async function cancelPurchase(id: string, reason: string) {
  const session = requirePermission(await getCurrentSession(), "purchases.manage");
  if (!reason.trim()) throw new Error("El motivo de cancelación es obligatorio");
  const businessId = session.user.businessId;

  const guarded = await prisma.purchase.updateMany({
    where: { id, businessId, status: "PENDIENTE" },
    data: { status: "CANCELADA", cancelledAt: new Date(), cancelReason: reason },
  });
  if (guarded.count === 0) {
    throw new Error("Solo se pueden cancelar compras pendientes (no recibidas)");
  }

  await writeAuditLog(prisma, {
    businessId,
    userId: session.user.id,
    action: "PURCHASE_CANCEL",
    entityType: "Purchase",
    entityId: id,
    metadata: { reason },
  });

  revalidatePath("/compras");
  revalidatePath(`/compras/${id}`);
}
