"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { supplierSchema, type SupplierInput } from "@/lib/validations/supplier.schema";

export async function listSuppliers(includeInactive = true) {
  const session = requirePermission(await getCurrentSession(), "suppliers.manage");
  return prisma.supplier.findMany({
    where: { businessId: session.user.businessId, active: includeInactive ? undefined : true },
    include: { _count: { select: { purchases: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(input: SupplierInput) {
  const session = requirePermission(await getCurrentSession(), "suppliers.manage");
  const data = supplierSchema.parse(input);

  if (data.ruc) {
    const dup = await prisma.supplier.findFirst({ where: { businessId: session.user.businessId, ruc: data.ruc } });
    if (dup) throw new Error("Ya existe un proveedor con ese RUC");
  }

  const supplier = await prisma.supplier.create({
    data: {
      businessId: session.user.businessId,
      name: data.name,
      ruc: data.ruc || null,
      contactName: data.contactName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      active: data.active,
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "SUPPLIER_CREATE",
    entityType: "Supplier",
    entityId: supplier.id,
  });

  revalidatePath("/proveedores");
  return supplier;
}

export async function updateSupplier(input: SupplierInput) {
  const session = requirePermission(await getCurrentSession(), "suppliers.manage");
  const data = supplierSchema.parse(input);
  if (!data.id) throw new Error("ID requerido");

  const existing = await prisma.supplier.findFirst({
    where: { id: data.id, businessId: session.user.businessId },
  });
  if (!existing) throw new Error("Proveedor no encontrado");

  if (data.ruc && data.ruc !== existing.ruc) {
    const dup = await prisma.supplier.findFirst({ where: { businessId: session.user.businessId, ruc: data.ruc } });
    if (dup) throw new Error("Ya existe un proveedor con ese RUC");
  }

  const supplier = await prisma.supplier.update({
    where: { id: data.id },
    data: {
      name: data.name,
      ruc: data.ruc || null,
      contactName: data.contactName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      active: data.active,
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "SUPPLIER_UPDATE",
    entityType: "Supplier",
    entityId: supplier.id,
  });

  revalidatePath("/proveedores");
  return supplier;
}

export async function deleteSupplier(id: string) {
  const session = requirePermission(await getCurrentSession(), "suppliers.manage");
  const existing = await prisma.supplier.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { _count: { select: { purchases: true } } },
  });
  if (!existing) throw new Error("Proveedor no encontrado");

  if (existing._count.purchases > 0) {
    await prisma.supplier.update({ where: { id }, data: { active: false } });
    revalidatePath("/proveedores");
    return { hardDeleted: false as const };
  }

  await prisma.supplier.delete({ where: { id } });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "SUPPLIER_DELETE",
    entityType: "Supplier",
    entityId: id,
  });

  revalidatePath("/proveedores");
  return { hardDeleted: true as const };
}
