"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission, can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { serializeDecimals } from "@/lib/serialize";
import { round2 } from "@/lib/money";
import {
  openCashRegisterSchema,
  cashMovementSchema,
  closeCashRegisterSchema,
  type OpenCashRegisterInput,
  type CashMovementInput,
  type CloseCashRegisterInput,
} from "@/lib/validations/cash.schema";

/**
 * Chequeo liviano de "¿hay caja abierta?" para el POS — a diferencia de
 * getCurrentRegister(), no requiere "cash.view" (que Vendedor no tiene) y no
 * expone montos/movimientos, solo si puede vender o no y si el usuario actual
 * tiene permiso para abrir una caja él mismo.
 */
export async function isRegisterOpen() {
  const session = requirePermission(await getCurrentSession(), "pos.sell");
  const register = await prisma.cashRegister.findFirst({
    where: { businessId: session.user.businessId, status: "OPEN" },
    select: { id: true },
  });
  return { open: !!register, canOpen: can(session, "cash.open") };
}

async function computeRegisterSummary(businessId: string, register: { id: string; openedAt: Date; closedAt: Date | null; openingAmount: unknown }) {
  const [cashSales, movements] = await Promise.all([
    prisma.payment.findMany({
      where: {
        paymentMethod: { code: "efectivo" },
        sale: {
          businessId,
          status: "ACTIVE",
          createdAt: { gte: register.openedAt, ...(register.closedAt ? { lte: register.closedAt } : {}) },
        },
      },
      select: { amount: true },
    }),
    prisma.cashMovement.findMany({ where: { cashRegisterId: register.id } }),
  ]);

  const ventasEfectivo = round2(cashSales.reduce((sum, p) => sum + Number(p.amount), 0));
  const ingresos = round2(
    movements.filter((m) => m.type === "INGRESO").reduce((sum, m) => sum + Number(m.amount), 0)
  );
  const egresos = round2(
    movements.filter((m) => m.type === "EGRESO").reduce((sum, m) => sum + Number(m.amount), 0)
  );
  const retiros = round2(
    movements.filter((m) => m.type === "RETIRO").reduce((sum, m) => sum + Number(m.amount), 0)
  );
  const openingAmount = Number(register.openingAmount);
  const expectedAmount = round2(openingAmount + ventasEfectivo + ingresos - egresos - retiros);

  return { ventasEfectivo, ingresos, egresos, retiros, openingAmount, expectedAmount, movements };
}

export async function getCurrentRegister() {
  const session = requirePermission(await getCurrentSession(), "cash.view");
  const register = await prisma.cashRegister.findFirst({
    where: { businessId: session.user.businessId, status: "OPEN" },
    include: { openedBy: true, movements: { include: { user: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!register) return null;

  const summary = await computeRegisterSummary(session.user.businessId, register);
  return serializeDecimals({ register, summary });
}

export async function openCashRegister(input: OpenCashRegisterInput) {
  const session = requirePermission(await getCurrentSession(), "cash.open");
  const data = openCashRegisterSchema.parse(input);
  const businessId = session.user.businessId;

  const existing = await prisma.cashRegister.findFirst({ where: { businessId, status: "OPEN" } });
  if (existing) throw new Error("Ya hay una caja abierta. Ciérrala antes de abrir una nueva.");

  const register = await prisma.cashRegister.create({
    data: {
      businessId,
      openedById: session.user.id,
      openingAmount: data.openingAmount,
      status: "OPEN",
    },
  });

  await writeAuditLog(prisma, {
    businessId,
    userId: session.user.id,
    action: "CASH_REGISTER_OPEN",
    entityType: "CashRegister",
    entityId: register.id,
    metadata: { openingAmount: data.openingAmount },
  });

  revalidatePath("/caja");
  return serializeDecimals(register);
}

export async function addCashMovement(input: CashMovementInput) {
  const session = requirePermission(await getCurrentSession(), "cash.movement");
  const data = cashMovementSchema.parse(input);
  const businessId = session.user.businessId;

  const register = await prisma.cashRegister.findFirst({ where: { businessId, status: "OPEN" } });
  if (!register) throw new Error("No hay una caja abierta");

  const movement = await prisma.cashMovement.create({
    data: {
      businessId,
      cashRegisterId: register.id,
      type: data.type,
      amount: data.amount,
      reason: data.reason,
      userId: session.user.id,
    },
  });

  await writeAuditLog(prisma, {
    businessId,
    userId: session.user.id,
    action: "CASH_MOVEMENT_CREATE",
    entityType: "CashMovement",
    entityId: movement.id,
    metadata: { type: data.type, amount: data.amount },
  });

  revalidatePath("/caja");
  return serializeDecimals(movement);
}

export async function closeCashRegister(input: CloseCashRegisterInput) {
  const session = requirePermission(await getCurrentSession(), "cash.close");
  const data = closeCashRegisterSchema.parse(input);
  const businessId = session.user.businessId;

  const register = await prisma.cashRegister.findFirst({ where: { businessId, status: "OPEN" } });
  if (!register) throw new Error("No hay una caja abierta");

  // La ventana de "ventas en efectivo" se cierra en este instante — se computa
  // primero y luego se persiste junto con el cierre, para que quede fija.
  const closedAt = new Date();
  const summary = await computeRegisterSummary(businessId, { ...register, closedAt });
  const difference = round2(data.countedAmount - summary.expectedAmount);

  const guarded = await prisma.cashRegister.updateMany({
    where: { id: register.id, status: "OPEN" },
    data: {
      status: "CLOSED",
      closedAt,
      closedById: session.user.id,
      countedAmount: data.countedAmount,
      expectedAmount: summary.expectedAmount,
      difference,
      notes: data.notes || null,
    },
  });
  if (guarded.count === 0) throw new Error("La caja ya fue cerrada");

  await writeAuditLog(prisma, {
    businessId,
    userId: session.user.id,
    action: "CASH_REGISTER_CLOSE",
    entityType: "CashRegister",
    entityId: register.id,
    metadata: { countedAmount: data.countedAmount, expectedAmount: summary.expectedAmount, difference },
  });

  revalidatePath("/caja");
  revalidatePath("/caja/historial");
  return { registerId: register.id, difference, expectedAmount: summary.expectedAmount };
}

export async function listCashRegisterHistory() {
  const session = requirePermission(await getCurrentSession(), "cash.view");
  const registers = await prisma.cashRegister.findMany({
    where: { businessId: session.user.businessId, status: "CLOSED" },
    include: { openedBy: true, closedBy: true },
    orderBy: { closedAt: "desc" },
    take: 100,
  });
  return serializeDecimals(registers);
}

export async function getCashRegisterDetail(id: string) {
  const session = requirePermission(await getCurrentSession(), "cash.view");
  const register = await prisma.cashRegister.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { openedBy: true, closedBy: true, movements: { include: { user: true }, orderBy: { createdAt: "desc" } } },
  });
  return serializeDecimals(register);
}
