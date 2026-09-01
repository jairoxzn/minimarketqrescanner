"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { UnauthorizedError } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

/** Acción de administrador: resetea la contraseña de cualquier usuario del negocio sin depender de correo. */
export async function adminResetUserPassword(userId: string, newPassword: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new UnauthorizedError("No autenticado");
  if (session.user.role !== "ADMIN") {
    throw new UnauthorizedError("Solo un administrador puede restablecer contraseñas");
  }
  if (newPassword.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, businessId: session.user.businessId },
  });
  if (!target) throw new Error("Usuario no encontrado");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "USER_PASSWORD_RESET_BY_ADMIN",
    entityType: "User",
    entityId: userId,
  });

  return { ok: true as const };
}
