"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { businessSchema, type BusinessInput } from "@/lib/validations/business.schema";

export async function getBusiness() {
  const session = requirePermission(await getCurrentSession(), "dashboard.view");
  return prisma.business.findUniqueOrThrow({ where: { id: session.user.businessId } });
}

export async function updateBusiness(input: BusinessInput) {
  const session = requirePermission(await getCurrentSession(), "business.manage");
  const data = businessSchema.parse(input);
  const businessId = session.user.businessId;

  const current = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const seriesChanged = data.ticketSeries !== current.ticketSeries;

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: {
        name: data.name,
        legalName: data.legalName || null,
        ruc: data.ruc || null,
        address: data.address || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        logoUrl: data.logoUrl || null,
        currencySymbol: data.currencySymbol,
        igvEnabled: data.igvEnabled,
        igvPercent: data.igvPercent,
        igvIncluded: data.igvIncluded,
        ticketSeries: data.ticketSeries,
        allowNegativeStock: data.allowNegativeStock,
      },
    });

    if (seriesChanged || data.resetTicketCounter) {
      await tx.ticketCounter.update({
        where: { businessId },
        data: {
          series: data.ticketSeries,
          current: data.resetTicketCounter ? 0 : undefined,
        },
      });
    }

    await writeAuditLog(tx, {
      businessId,
      userId: session.user.id,
      action: "BUSINESS_UPDATE",
      entityType: "Business",
      entityId: businessId,
      metadata: { seriesChanged, counterReset: data.resetTicketCounter },
    });
  });

  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
}
