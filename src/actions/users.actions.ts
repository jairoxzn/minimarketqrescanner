"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { userSchema, type UserInput } from "@/lib/validations/user.schema";

export async function listUsers() {
  const session = requirePermission(await getCurrentSession(), "users.manage");
  return prisma.user.findMany({
    where: { businessId: session.user.businessId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(input: UserInput) {
  const session = requirePermission(await getCurrentSession(), "users.manage");
  const data = userSchema.parse(input);
  if (!data.password || data.password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) throw new Error("Ya existe un usuario con ese correo");

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      businessId: session.user.businessId,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      active: data.active,
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "USER_CREATE",
    entityType: "User",
    entityId: user.id,
    metadata: { role: data.role },
  });

  revalidatePath("/usuarios");
  return user;
}

export async function updateUser(input: UserInput) {
  const session = requirePermission(await getCurrentSession(), "users.manage");
  const data = userSchema.parse(input);
  if (!data.id) throw new Error("ID requerido");

  const existing = await prisma.user.findFirst({
    where: { id: data.id, businessId: session.user.businessId },
  });
  if (!existing) throw new Error("Usuario no encontrado");

  if (existing.id === session.user.id) {
    if (data.role !== "ADMIN") throw new Error("No puedes quitarte el rol de administrador a ti mismo");
    if (!data.active) throw new Error("No puedes desactivar tu propia cuenta");
  }

  if (data.email.toLowerCase().trim() !== existing.email) {
    const dup = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
    if (dup) throw new Error("Ya existe un usuario con ese correo");
  }

  const user = await prisma.user.update({
    where: { id: data.id },
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      role: data.role,
      active: data.active,
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "USER_UPDATE",
    entityType: "User",
    entityId: user.id,
  });

  revalidatePath("/usuarios");
  return user;
}
