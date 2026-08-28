"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const session = requirePermission(await getCurrentSession(), "audit.view");
  const where: Prisma.AuditLogWhereInput = { businessId: session.user.businessId };

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  return prisma.auditLog.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
}

/** Para poblar el filtro de "Acción" con los valores realmente usados, sin mantener una lista a mano. */
export async function listAuditActionTypes() {
  const session = requirePermission(await getCurrentSession(), "audit.view");
  const rows = await prisma.auditLog.findMany({
    where: { businessId: session.user.businessId },
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });
  return rows.map((r) => r.action);
}
