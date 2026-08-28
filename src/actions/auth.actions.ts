"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth.schema";
import { getCurrentSession } from "@/lib/session";
import { UnauthorizedError } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { recordAttempt, formatRetryAfter } from "@/lib/rateLimit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const RESET_REQUEST_MAX = 3;
const RESET_REQUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hora

/**
 * Envío real de correo requiere variables SMTP_* (no configuradas en este MVP).
 * Sin ellas, el link de recuperación se registra en la consola del servidor —
 * flujo de respaldo documentado en el plan. Nunca revela si el correo existe.
 */
export async function requestPasswordReset(input: { email: string }) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Correo inválido" };
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Límite por email (PRD §29 "Rate limiting") — evita generar tokens/spam
  // sin filtrar si el correo existe (el resultado sigue siendo el mismo mensaje genérico).
  const rateLimit = recordAttempt(`password-reset:${email}`, RESET_REQUEST_MAX, RESET_REQUEST_WINDOW_MS);
  if (rateLimit.limited) {
    return {
      ok: true as const,
      message: `Si el correo existe, se envió un enlace de recuperación. Si ya lo solicitaste antes, espera ${formatRetryAfter(rateLimit.retryAfterMs)} antes de intentar de nuevo.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.active) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password/${token}`;

    if (process.env.SMTP_HOST) {
      // TODO: enviar correo real cuando se configure un proveedor SMTP.
      console.log(`[password-reset] enviar correo a ${user.email}: ${resetUrl}`);
    } else {
      console.log(`[password-reset] SMTP no configurado. Link de recuperación para ${user.email}: ${resetUrl}`);
    }
  }

  // Mensaje genérico siempre, para no filtrar si el correo existe.
  return {
    ok: true as const,
    message: "Si el correo existe, se envió un enlace de recuperación.",
  };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: input.token },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { ok: false as const, message: "El enlace no es válido o ha expirado" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  return { ok: true as const, message: "Contraseña actualizada correctamente" };
}

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
