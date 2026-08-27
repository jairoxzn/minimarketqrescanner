"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { brandSchema, type BrandInput } from "@/lib/validations/brand.schema";

export async function listBrands() {
  const session = requirePermission(await getCurrentSession(), "brands.view");
  return prisma.brand.findMany({
    where: { businessId: session.user.businessId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createBrand(input: BrandInput) {
  const session = requirePermission(await getCurrentSession(), "brands.manage");
  const data = brandSchema.parse(input);

  const brand = await prisma.brand.create({
    data: { businessId: session.user.businessId, name: data.name },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "BRAND_CREATE",
    entityType: "Brand",
    entityId: brand.id,
  });

  revalidatePath("/marcas");
  return brand;
}

export async function updateBrand(input: BrandInput) {
  const session = requirePermission(await getCurrentSession(), "brands.manage");
  const data = brandSchema.parse(input);
  if (!data.id) throw new Error("ID requerido");

  const existing = await prisma.brand.findFirst({
    where: { id: data.id, businessId: session.user.businessId },
  });
  if (!existing) throw new Error("Marca no encontrada");

  const brand = await prisma.brand.update({ where: { id: data.id }, data: { name: data.name } });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "BRAND_UPDATE",
    entityType: "Brand",
    entityId: brand.id,
  });

  revalidatePath("/marcas");
  return brand;
}

export async function deleteBrand(id: string) {
  const session = requirePermission(await getCurrentSession(), "brands.manage");

  const existing = await prisma.brand.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw new Error("Marca no encontrada");
  if (existing._count.products > 0) {
    throw new Error("No se puede eliminar: tiene productos asociados");
  }

  await prisma.brand.delete({ where: { id } });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "BRAND_DELETE",
    entityType: "Brand",
    entityId: id,
  });

  revalidatePath("/marcas");
}
