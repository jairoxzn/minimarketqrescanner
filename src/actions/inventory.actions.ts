"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export async function listInventoryOverview() {
  const session = requirePermission(await getCurrentSession(), "inventory.view");
  const products = await prisma.product.findMany({
    where: { businessId: session.user.businessId, active: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return products;
}

export interface MovementFilters {
  productId?: string;
  type?: "ENTRADA" | "SALIDA" | "AJUSTE";
}

export async function listInventoryMovements(filters: MovementFilters = {}) {
  const session = requirePermission(await getCurrentSession(), "inventory.view");
  const where: Prisma.InventoryMovementWhereInput = { businessId: session.user.businessId };
  if (filters.productId) where.productId = filters.productId;
  if (filters.type) where.type = filters.type;

  return prisma.inventoryMovement.findMany({
    where,
    include: { product: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** Registra una entrada de mercadería (compra, reposición, etc.) — suma al stock actual. */
export async function addStockEntry(productId: string, quantity: number, reason: string) {
  const session = requirePermission(await getCurrentSession(), "inventory.manage");
  if (quantity <= 0) throw new Error("La cantidad debe ser mayor a 0");

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, businessId: session.user.businessId },
    });
    if (!product) throw new Error("Producto no encontrado");

    const rows = await tx.$queryRaw<{ stock: number }[]>`
      UPDATE products SET stock = stock + ${quantity}
      WHERE id = ${productId}
      RETURNING stock
    `;
    const newStock = rows[0].stock;

    await tx.inventoryMovement.create({
      data: {
        businessId: session.user.businessId,
        productId,
        type: "ENTRADA",
        quantity,
        previousStock: newStock - quantity,
        newStock,
        reason: reason || "Entrada de mercadería",
        referenceType: "MANUAL",
        userId: session.user.id,
      },
    });

    await writeAuditLog(tx, {
      businessId: session.user.businessId,
      userId: session.user.id,
      action: "INVENTORY_ENTRY",
      entityType: "Product",
      entityId: productId,
      metadata: { quantity, newStock },
    });
  });

  revalidatePath("/inventario");
  revalidatePath("/productos");
}

/** Corrige el stock a un valor exacto (ej. tras un conteo físico). El delta puede ser positivo o negativo. */
export async function adjustStockTo(productId: string, newStockValue: number, reason: string) {
  const session = requirePermission(await getCurrentSession(), "inventory.manage");
  if (newStockValue < 0) throw new Error("El stock no puede ser negativo");
  if (!reason.trim()) throw new Error("El motivo del ajuste es obligatorio");

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, businessId: session.user.businessId },
    });
    if (!product) throw new Error("Producto no encontrado");

    const delta = newStockValue - product.stock;
    if (delta === 0) throw new Error("El nuevo stock es igual al actual");

    await tx.product.update({ where: { id: productId }, data: { stock: newStockValue } });

    await tx.inventoryMovement.create({
      data: {
        businessId: session.user.businessId,
        productId,
        type: "AJUSTE",
        quantity: delta,
        previousStock: product.stock,
        newStock: newStockValue,
        reason,
        referenceType: "MANUAL",
        userId: session.user.id,
      },
    });

    await writeAuditLog(tx, {
      businessId: session.user.businessId,
      userId: session.user.id,
      action: "INVENTORY_ADJUST",
      entityType: "Product",
      entityId: productId,
      metadata: { delta, newStock: newStockValue, reason },
    });
  });

  revalidatePath("/inventario");
  revalidatePath("/productos");
}
