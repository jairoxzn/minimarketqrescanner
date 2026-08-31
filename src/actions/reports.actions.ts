"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { round2 } from "@/lib/money";
import { classifyStock } from "@/lib/stock";

export interface ReportDateRange {
  dateFrom?: string;
  dateTo?: string;
}

function resolveRange(range: ReportDateRange) {
  const now = new Date();
  const from = range.dateFrom ? new Date(range.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = range.dateTo ? new Date(range.dateTo) : now;
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export async function getSalesReport(range: ReportDateRange = {}) {
  const session = requirePermission(await getCurrentSession(), "sales.viewOwn");
  const businessId = session.user.businessId;
  const canViewAll = session.user.role === "ADMIN";
  const { from, to } = resolveRange(range);

  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      status: "ACTIVE",
      createdAt: { gte: from, lte: to },
      ...(canViewAll ? {} : { userId: session.user.id }),
    },
    include: { user: true, payments: { include: { paymentMethod: true } } },
  });

  const totalVentas = round2(sales.reduce((sum, s) => sum + Number(s.total), 0));
  const numeroVentas = sales.length;
  const ticketPromedio = numeroVentas > 0 ? round2(totalVentas / numeroVentas) : 0;

  const byUser = new Map<string, { name: string; count: number; total: number }>();
  const byMethod = new Map<string, { name: string; count: number; total: number }>();

  for (const sale of sales) {
    const u = byUser.get(sale.userId) ?? { name: sale.user.name, count: 0, total: 0 };
    u.count += 1;
    u.total = round2(u.total + Number(sale.total));
    byUser.set(sale.userId, u);

    for (const p of sale.payments) {
      const m = byMethod.get(p.paymentMethodId) ?? { name: p.paymentMethod.name, count: 0, total: 0 };
      m.count += 1;
      m.total = round2(m.total + Number(p.amount));
      byMethod.set(p.paymentMethodId, m);
    }
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totalVentas,
    numeroVentas,
    ticketPromedio,
    porUsuario: [...byUser.values()].sort((a, b) => b.total - a.total),
    porMetodoPago: [...byMethod.values()].sort((a, b) => b.total - a.total),
  };
}

export async function getProductsReport() {
  const session = requirePermission(await getCurrentSession(), "products.view");
  const businessId = session.user.businessId;

  const [products, saleItems] = await Promise.all([
    prisma.product.findMany({ where: { businessId, active: true } }),
    prisma.saleItem.findMany({
      where: { sale: { businessId, status: "ACTIVE" } },
      select: { productId: true, productName: true, quantity: true, unitPrice: true, unitCost: true, discount: true },
    }),
  ]);

  const salesByProduct = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
  for (const item of saleItems) {
    const existing = salesByProduct.get(item.productId) ?? { name: item.productName, quantity: 0, revenue: 0, profit: 0 };
    existing.quantity += item.quantity;
    existing.revenue = round2(existing.revenue + Number(item.unitPrice) * item.quantity - Number(item.discount));
    existing.profit = round2(existing.profit + (Number(item.unitPrice) - Number(item.unitCost)) * item.quantity - Number(item.discount));
    salesByProduct.set(item.productId, existing);
  }

  const ranked = [...salesByProduct.entries()].map(([productId, v]) => ({ productId, ...v }));
  const masVendidos = [...ranked].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const menosVendidos = [...ranked].sort((a, b) => a.quantity - b.quantity).slice(0, 10);
  const gananciaTotal = round2(ranked.reduce((sum, r) => sum + r.profit, 0));

  const { outOfStock: agotados, lowStock: stockBajo } = classifyStock(products);

  return {
    masVendidos,
    menosVendidos,
    gananciaPorProducto: ranked.sort((a, b) => b.profit - a.profit),
    gananciaTotal,
    stockActual: products.map((p) => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock })),
    agotados: agotados.map((p) => ({ id: p.id, name: p.name })),
    stockBajo: stockBajo.map((p) => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock })),
  };
}
