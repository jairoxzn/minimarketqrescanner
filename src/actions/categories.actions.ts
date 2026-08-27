"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { categorySchema, type CategoryInput } from "@/lib/validations/category.schema";

export async function listCategories() {
  const session = requirePermission(await getCurrentSession(), "categories.view");
  return prisma.category.findMany({
    where: { businessId: session.user.businessId },
    include: { parent: true, _count: { select: { products: true, children: true } } },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(input: CategoryInput) {
  const session = requirePermission(await getCurrentSession(), "categories.manage");
  const data = categorySchema.parse(input);

  const category = await prisma.category.create({
    data: {
      businessId: session.user.businessId,
      name: data.name,
      parentId: data.parentId || null,
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "CATEGORY_CREATE",
    entityType: "Category",
    entityId: category.id,
  });

  revalidatePath("/categorias");
  return category;
}

export async function updateCategory(input: CategoryInput) {
  const session = requirePermission(await getCurrentSession(), "categories.manage");
  const data = categorySchema.parse(input);
  if (!data.id) throw new Error("ID requerido");
  if (data.parentId === data.id) throw new Error("Una categoría no puede ser su propia subcategoría");

  const existing = await prisma.category.findFirst({
    where: { id: data.id, businessId: session.user.businessId },
  });
  if (!existing) throw new Error("Categoría no encontrada");

  const category = await prisma.category.update({
    where: { id: data.id },
    data: { name: data.name, parentId: data.parentId || null },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "CATEGORY_UPDATE",
    entityType: "Category",
    entityId: category.id,
  });

  revalidatePath("/categorias");
  return category;
}

export async function deleteCategory(id: string) {
  const session = requirePermission(await getCurrentSession(), "categories.manage");

  const existing = await prisma.category.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!existing) throw new Error("Categoría no encontrada");
  if (existing._count.products > 0 || existing._count.children > 0) {
    throw new Error("No se puede eliminar: tiene productos o subcategorías asociadas");
  }

  await prisma.category.delete({ where: { id } });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "CATEGORY_DELETE",
    entityType: "Category",
    entityId: id,
  });

  revalidatePath("/categorias");
}
