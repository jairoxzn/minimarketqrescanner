"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getSalesReport, type ReportDateRange } from "@/actions/reports.actions";
import { downloadTablePdf } from "@/lib/pdf/reportsPdf";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { formatMoney } from "@/lib/money";

type Report = Awaited<ReturnType<typeof getSalesReport>>;

export function VentasReportClient({ initialReport }: { initialReport: Report }) {
  const [report, setReport] = useState(initialReport);
  const [range, setRange] = useState<ReportDateRange>({});
  const [isPending, startTransition] = useTransition();

  const applyRange = (next: ReportDateRange) => {
    setRange(next);
    startTransition(async () => setReport(await getSalesReport(next)));
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(report.porUsuario.map((u) => ({ Usuario: u.name, "N° ventas": u.count, Total: u.total }))),
      "Por usuario"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(report.porMetodoPago.map((m) => ({ Método: m.name, "N° pagos": m.count, Total: m.total }))),
      "Por método de pago"
    );
    XLSX.writeFile(wb, `reporte_ventas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPdf = async () => {
    await downloadTablePdf(
      "Reporte de ventas",
      ["Usuario", "N° ventas", "Total"],
      report.porUsuario.map((u) => [u.name, u.count, formatMoney(u.total)]),
      `reporte_ventas_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Reporte de ventas</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/reportes/productos"><Button variant="secondary">Ver reporte de productos</Button></Link>
          <Button variant="secondary" onClick={handleExportExcel}>⬇ Excel</Button>
          <Button variant="secondary" onClick={handleExportPdf}>⬇ PDF</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-border">
        <Input type="date" label="Desde" onChange={(e) => applyRange({ ...range, dateFrom: e.target.value })} />
        <Input type="date" label="Hasta" onChange={(e) => applyRange({ ...range, dateTo: e.target.value })} />
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${isPending ? "opacity-60" : ""}`}>
        <Card><CardBody><p className="text-sm text-muted">Ventas totales</p><p className="text-2xl font-bold text-foreground">{formatMoney(report.totalVentas)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Número de ventas</p><p className="text-2xl font-bold text-foreground">{report.numeroVentas}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Ticket promedio</p><p className="text-2xl font-bold text-foreground">{formatMoney(report.ticketPromedio)}</p></CardBody></Card>
      </div>

      <h2 className="text-sm font-semibold text-foreground">Ventas por usuario</h2>
      <Table>
        <Thead><Tr><Th>Usuario</Th><Th>N° ventas</Th><Th>Total</Th></Tr></Thead>
        <Tbody>
          {report.porUsuario.map((u) => (
            <Tr key={u.name}><Td className="font-medium">{u.name}</Td><Td>{u.count}</Td><Td>{formatMoney(u.total)}</Td></Tr>
          ))}
        </Tbody>
      </Table>

      <h2 className="text-sm font-semibold text-foreground">Ventas por método de pago</h2>
      <Table>
        <Thead><Tr><Th>Método</Th><Th>N° pagos</Th><Th>Total</Th></Tr></Thead>
        <Tbody>
          {report.porMetodoPago.map((m) => (
            <Tr key={m.name}><Td className="font-medium">{m.name}</Td><Td>{m.count}</Td><Td>{formatMoney(m.total)}</Td></Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
