"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { round2 } from "@/lib/money";
import { startOfDayLima, formatDateShort } from "@/lib/date";

export async function getDashboardData() {
  const session = requirePermission(await getCurrentSession(), "dashboard.view");
  const businessId = session.user.businessId;

  const now = new Date();
  // Todos los límites de fecha se calculan en hora de Lima (vía getUTC*, ya que
  // todayStart es un instante UTC que representa la medianoche de Lima) —
  // así "hoy/esta semana/este mes" no dependen de la zona horaria del servidor.
  const todayStart = startOfDayLima(now);
  const dow = todayStart.getUTCDay(); // 0 = domingo
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  const monthStart = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1, 5, 0, 0, 0));
  const chartStart = new Date(todayStart);
  chartStart.setUTCDate(chartStart.getUTCDate() - 6);

  const rangeStart = chartStart < monthStart ? chartStart : monthStart;

  const [sales, products] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, status: "ACTIVE", createdAt: { gte: rangeStart } },
      include: { items: true, payments: { include: { paymentMethod: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({ where: { businessId, active: true }, include: { category: true } }),
  ]);

  const salesToday = sales.filter((s) => s.createdAt >= todayStart);
  const salesWeek = sales.filter((s) => s.createdAt >= weekStart);
  const salesMonth = sales.filter((s) => s.createdAt >= monthStart);

  const sumTotal = (arr: typeof sales) => round2(arr.reduce((sum, s) => sum + Number(s.total), 0));

  const gananciaMes = round2(
    salesMonth.reduce(
      (sum, s) =>
        sum +
        s.items.reduce((isum, i) => isum + (Number(i.unitPrice) - Number(i.unitCost)) * i.quantity - Number(i.discount), 0),
      0
    )
  );

  const productosVendidosMes = salesMonth.reduce((sum, s) => sum + s.items.reduce((isum, i) => isum + i.quantity, 0), 0);

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  const outOfStock = products.filter((p) => p.stock <= 0);

  const salesByDay = Array.from({ length: 7 }, (_, idx) => {
    const dayDate = new Date(todayStart);
    dayDate.setUTCDate(dayDate.getUTCDate() - (6 - idx));
    const nextDay = new Date(dayDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const dayTotal = sales
      .filter((s) => s.createdAt >= dayDate && s.createdAt < nextDay)
      .reduce((sum, s) => sum + Number(s.total), 0);
    return { label: formatDateShort(dayDate, { weekday: "short", day: "numeric" }), total: round2(dayTotal) };
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const topProductsMap = new Map<string, { name: string; quantity: number; total: number }>();
  const categoryMap = new Map<string, number>();
  const paymentMethodMap = new Map<string, number>();

  for (const sale of salesMonth) {
    for (const item of sale.items) {
      const existing = topProductsMap.get(item.productId) ?? { name: item.productName, quantity: 0, total: 0 };
      existing.quantity += item.quantity;
      existing.total += Number(item.subtotal);
      topProductsMap.set(item.productId, existing);

      const categoryName = productMap.get(item.productId)?.category?.name ?? "Sin categoría";
      categoryMap.set(categoryName, round2((categoryMap.get(categoryName) ?? 0) + Number(item.subtotal)));
    }
    for (const payment of sale.payments) {
      const name = payment.paymentMethod.name;
      paymentMethodMap.set(name, round2((paymentMethodMap.get(name) ?? 0) + Number(payment.amount)));
    }
  }

  const topProducts = [...topProductsMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map((p) => ({ ...p, total: round2(p.total) }));

  const paymentMethodBreakdown = [...paymentMethodMap.entries()].map(([name, total]) => ({ name, total }));
  const categoryBreakdown = [...categoryMap.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return {
    today: { count: salesToday.length, total: sumTotal(salesToday) },
    week: { count: salesWeek.length, total: sumTotal(salesWeek) },
    month: { count: salesMonth.length, total: sumTotal(salesMonth) },
    gananciaMes,
    productosVendidosMes,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStockProducts: lowStock.slice(0, 8),
    salesByDay,
    topProducts,
    paymentMethodBreakdown,
    categoryBreakdown,
  };
}
