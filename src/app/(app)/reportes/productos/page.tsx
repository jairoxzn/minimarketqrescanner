import Link from "next/link";
import { getProductsReport } from "@/actions/reports.actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { ExportProductsReportButtons } from "./ExportButtons";

export default async function ReporteProductosPage() {
  const report = await getProductsReport();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Reporte de productos y ganancias</h1>
        <div className="flex gap-2">
          <Link href="/reportes/ventas"><Button variant="secondary">Ver reporte de ventas</Button></Link>
          <ExportProductsReportButtons report={report} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardBody><p className="text-sm text-muted">Ganancia total (histórica)</p><p className="text-2xl font-bold text-foreground">{formatMoney(report.gananciaTotal)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Productos agotados</p><p className="text-2xl font-bold text-danger">{report.agotados.length}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Productos con stock bajo</p><p className="text-2xl font-bold text-warning">{report.stockBajo.length}</p></CardBody></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Más vendidos</h2>
          <Table>
            <Thead><Tr><Th>Producto</Th><Th>Cant.</Th><Th>Ingresos</Th></Tr></Thead>
            <Tbody>
              {report.masVendidos.map((p) => (
                <Tr key={p.productId}><Td>{p.name}</Td><Td>{p.quantity}</Td><Td>{formatMoney(p.revenue)}</Td></Tr>
              ))}
            </Tbody>
          </Table>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Menos vendidos</h2>
          <Table>
            <Thead><Tr><Th>Producto</Th><Th>Cant.</Th><Th>Ingresos</Th></Tr></Thead>
            <Tbody>
              {report.menosVendidos.map((p) => (
                <Tr key={p.productId}><Td>{p.name}</Td><Td>{p.quantity}</Td><Td>{formatMoney(p.revenue)}</Td></Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-foreground">Ganancia por producto</h2>
      <Table>
        <Thead><Tr><Th>Producto</Th><Th>Cant. vendida</Th><Th>Ingresos</Th><Th>Ganancia</Th></Tr></Thead>
        <Tbody>
          {report.gananciaPorProducto.map((p) => (
            <Tr key={p.productId}><Td>{p.name}</Td><Td>{p.quantity}</Td><Td>{formatMoney(p.revenue)}</Td><Td className="font-medium text-emerald-700">{formatMoney(p.profit)}</Td></Tr>
          ))}
        </Tbody>
      </Table>

      <h2 className="text-sm font-semibold text-foreground">Stock actual</h2>
      <Table>
        <Thead><Tr><Th>Producto</Th><Th>Stock</Th><Th>Estado</Th></Tr></Thead>
        <Tbody>
          {report.stockActual.map((p) => {
            const tone = p.stock <= 0 ? "danger" : p.stock <= p.minStock ? "warning" : "success";
            const label = p.stock <= 0 ? "Agotado" : p.stock <= p.minStock ? "Stock bajo" : "Normal";
            return (
              <Tr key={p.id}><Td>{p.name}</Td><Td>{p.stock}</Td><Td><Badge tone={tone}>{label}</Badge></Td></Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
}
