"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { paymentMethodSchema, type PaymentMethodInput } from "@/lib/validations/paymentMethod.schema";

export async function listPaymentMethods(includeInactive = false) {
  const session = requirePermission(await getCurrentSession(), "paymentMethods.view");
  return prisma.paymentMethod.findMany({
    where: { businessId: session.user.businessId, active: includeInactive ? undefined : true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createPaymentMethod(input: PaymentMethodInput) {
  const session = requirePermission(await getCurrentSession(), "paymentMethods.manage");
  const data = paymentMethodSchema.parse(input);

  const count = await prisma.paymentMethod.count({ where: { businessId: session.user.businessId } });
  const method = await prisma.paymentMethod.create({
    data: {
      businessId: session.user.businessId,
      name: data.name,
      code: data.code,
      sortOrder: count,
      qrImageUrl: data.qrImageUrl || null,
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "PAYMENT_METHOD_CREATE",
    entityType: "PaymentMethod",
    entityId: method.id,
  });

  revalidatePath("/configuracion");
  return method;
}

export async function updatePaymentMethod(input: PaymentMethodInput) {
  const session = requirePermission(await getCurrentSession(), "paymentMethods.manage");
  const data = paymentMethodSchema.parse(input);
  if (!data.id) throw new Error("ID requerido");

  const existing = await prisma.paymentMethod.findFirst({
    where: { id: data.id, businessId: session.user.businessId },
  });
  if (!existing) throw new Error("Método de pago no encontrado");

  const method = await prisma.paymentMethod.update({
    where: { id: data.id },
    data: { name: data.name, code: data.code, qrImageUrl: data.qrImageUrl || null },
  });

  revalidatePath("/configuracion");
  return method;
}

export async function togglePaymentMethodActive(id: string) {
  const session = requirePermission(await getCurrentSession(), "paymentMethods.manage");
  const existing = await prisma.paymentMethod.findFirst({
    where: { id, businessId: session.user.businessId },
  });
  if (!existing) throw new Error("Método de pago no encontrado");

  const method = await prisma.paymentMethod.update({
    where: { id },
    data: { active: !existing.active },
  });

  revalidatePath("/configuracion");
  return method;
}

export async function deletePaymentMethod(id: string) {
  const session = requirePermission(await getCurrentSession(), "paymentMethods.manage");
  const existing = await prisma.paymentMethod.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { _count: { select: { payments: true } } },
  });
  if (!existing) throw new Error("Método de pago no encontrado");
  if (existing._count.payments > 0) {
    throw new Error("No se puede eliminar: ya se usó en ventas. Desactívalo en su lugar.");
  }

  await prisma.paymentMethod.delete({ where: { id } });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "PAYMENT_METHOD_DELETE",
    entityType: "PaymentMethod",
    entityId: id,
  });

  revalidatePath("/configuracion");
}
