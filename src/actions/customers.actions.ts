"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { serializeDecimals } from "@/lib/serialize";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer.schema";

export async function listCustomers(search?: string) {
  const session = requirePermission(await getCurrentSession(), "customers.view");
  const where: Prisma.CustomerWhereInput = { businessId: session.user.businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { docNumber: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }
  return prisma.customer.findMany({
    where,
    orderBy: [{ isGeneral: "desc" }, { name: "asc" }],
  });
}

export async function getCustomer(id: string) {
  const session = requirePermission(await getCurrentSession(), "customers.view");
  const customer = await prisma.customer.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      sales: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { items: true },
      },
    },
  });
  return serializeDecimals(customer);
}

export async function getGeneralCustomer(businessId: string) {
  return prisma.customer.findFirst({ where: { businessId, isGeneral: true } });
}

export async function createCustomer(input: CustomerInput) {
  const session = requirePermission(await getCurrentSession(), "customers.create");
  const data = customerSchema.parse(input);

  const customer = await prisma.customer.create({
    data: {
      businessId: session.user.businessId,
      name: data.name,
      docType: data.docType,
      docNumber: data.docNumber || null,
      phone: data.phone || null,
      address: data.address || null,
      email: data.email || null,
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "CUSTOMER_CREATE",
    entityType: "Customer",
    entityId: customer.id,
  });

  revalidatePath("/clientes");
  return customer;
}

export async function updateCustomer(input: CustomerInput) {
  const session = requirePermission(await getCurrentSession(), "customers.update");
  const data = customerSchema.parse(input);
  if (!data.id) throw new Error("ID requerido");

  const existing = await prisma.customer.findFirst({
    where: { id: data.id, businessId: session.user.businessId },
  });
  if (!existing) throw new Error("Cliente no encontrado");

  const customer = await prisma.customer.update({
    where: { id: data.id },
    data: {
      name: data.name,
      docType: data.docType,
      docNumber: data.docNumber || null,
      phone: data.phone || null,
      address: data.address || null,
      email: data.email || null,
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "CUSTOMER_UPDATE",
    entityType: "Customer",
    entityId: customer.id,
  });

  revalidatePath("/clientes");
  return customer;
}

export async function deleteCustomer(id: string) {
  const session = requirePermission(await getCurrentSession(), "customers.delete");

  const existing = await prisma.customer.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { _count: { select: { sales: true } } },
  });
  if (!existing) throw new Error("Cliente no encontrado");
  if (existing.isGeneral) throw new Error("No se puede eliminar el Cliente General");
  if (existing._count.sales > 0) throw new Error("No se puede eliminar: tiene ventas registradas");

  await prisma.customer.delete({ where: { id } });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "CUSTOMER_DELETE",
    entityType: "Customer",
    entityId: id,
  });

  revalidatePath("/clientes");
}
