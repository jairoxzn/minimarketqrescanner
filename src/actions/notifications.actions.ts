"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission, can } from "@/lib/permissions";
import { classifyStock } from "@/lib/stock";

export interface NotificationItem {
  id: string;
  severity: "warning" | "danger";
  title: string;
  description: string;
  href: string;
}

// Una caja abierta por más de este tiempo aparece como aviso — pensado para
// detectar "se me olvidó cerrar la caja de ayer", no para marcar cada turno
// normal de varias horas.
const REGISTER_OPEN_WARNING_HOURS = 12;

/**
 * Centro de notificaciones (PRD §35) — deliberadamente SIN tabla ni estado
 * leído/no-leído propios: cada aviso se calcula en vivo a partir de datos
 * que ya existen (stock, caja), igual que el "Stock bajo" del dashboard.
 * Guardar notificaciones aparte arriesgaría que queden desincronizadas del
 * dato real (ej. un aviso de stock bajo que sigue ahí después de reponer) —
 * mismo criterio que serializeDecimals: derivar en vez de duplicar estado.
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const session = requirePermission(await getCurrentSession(), "dashboard.view");
  const businessId = session.user.businessId;
  const items: NotificationItem[] = [];

  const products = await prisma.product.findMany({
    where: { businessId, active: true },
    select: { id: true, name: true, stock: true, minStock: true },
  });
  const { outOfStock, lowStock } = classifyStock(products);

  if (outOfStock.length > 0) {
    items.push({
      id: "stock-out",
      severity: "danger",
      title: `${outOfStock.length} producto${outOfStock.length === 1 ? "" : "s"} agotado${outOfStock.length === 1 ? "" : "s"}`,
      description: outOfStock.slice(0, 3).map((p) => p.name).join(", ") + (outOfStock.length > 3 ? "…" : ""),
      href: "/productos?stockLevel=out",
    });
  }
  if (lowStock.length > 0) {
    items.push({
      id: "stock-low",
      severity: "warning",
      title: `${lowStock.length} producto${lowStock.length === 1 ? "" : "s"} con stock bajo`,
      description: lowStock.slice(0, 3).map((p) => p.name).join(", ") + (lowStock.length > 3 ? "…" : ""),
      href: "/productos?stockLevel=low",
    });
  }

  // Solo quien puede cerrar caja recibe este aviso — a Vendedor no le sirve
  // de nada verlo, no tiene permiso para actuar sobre él.
  if (can(session, "cash.view")) {
    const openRegister = await prisma.cashRegister.findFirst({
      where: { businessId, status: "OPEN" },
      select: { openedAt: true, openedBy: { select: { name: true } } },
    });
    if (openRegister) {
      const hoursOpen = (Date.now() - openRegister.openedAt.getTime()) / 3_600_000;
      if (hoursOpen >= REGISTER_OPEN_WARNING_HOURS) {
        items.push({
          id: "register-open-long",
          severity: "warning",
          title: "La caja lleva mucho tiempo abierta",
          description: `Abierta por ${openRegister.openedBy.name} hace ${Math.floor(hoursOpen)} horas — ¿se olvidó cerrarla?`,
          href: "/caja",
        });
      }
    }
  }

  return items;
}
