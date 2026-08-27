import Link from "next/link";
import { getDashboardData } from "@/actions/dashboard.actions";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { SalesByDayChart } from "@/components/charts/SalesByDayChart";
import { TopProductsChart } from "@/components/charts/TopProductsChart";
import { PaymentMethodChart } from "@/components/charts/PaymentMethodChart";
import { CategoryChart } from "@/components/charts/CategoryChart";

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const toneClass = tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-muted">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ventas hoy" value={`${data.today.count} · ${formatMoney(data.today.total)}`} />
        <StatCard label="Ventas semana" value={`${data.week.count} · ${formatMoney(data.week.total)}`} />
        <StatCard label="Ventas mes" value={`${data.month.count} · ${formatMoney(data.month.total)}`} />
        <StatCard label="Ganancia estimada (mes)" value={formatMoney(data.gananciaMes)} />
        <StatCard label="Productos vendidos (mes)" value={String(data.productosVendidosMes)} />
        <StatCard label="Ingresos por ventas (mes)" value={formatMoney(data.month.total)} />
        <StatCard label="Egresos de caja (mes)" value={formatMoney(data.egresosMes)} />
        <StatCard label="Stock bajo" value={String(data.lowStockCount)} tone={data.lowStockCount > 0 ? "warning" : undefined} />
        <StatCard label="Agotados" value={String(data.outOfStockCount)} tone={data.outOfStockCount > 0 ? "danger" : undefined} />
      </div>

      {(data.lowStockCount > 0 || data.outOfStockCount > 0) && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>⚠️ Alertas de stock</CardTitle>
            <Link href="/inventario" className="text-sm text-primary hover:underline">Ver inventario →</Link>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {data.lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted">{p.stock} {p.unit}</span>
                  <Badge tone={p.stock <= 0 ? "danger" : "warning"}>{p.stock <= 0 ? "Agotado" : "Stock bajo"}</Badge>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Ventas por día (últimos 7 días)</CardTitle></CardHeader>
          <CardBody><SalesByDayChart data={data.salesByDay} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Productos más vendidos (mes)</CardTitle></CardHeader>
          <CardBody><TopProductsChart data={data.topProducts.map((p) => ({ name: p.name, quantity: p.quantity }))} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Métodos de pago (mes)</CardTitle></CardHeader>
          <CardBody><PaymentMethodChart data={data.paymentMethodBreakdown} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Categorías con mayores ventas (mes)</CardTitle></CardHeader>
          <CardBody><CategoryChart data={data.categoryBreakdown} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
