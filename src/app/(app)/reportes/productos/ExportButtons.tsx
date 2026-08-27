"use client";

import { downloadTablePdf } from "@/lib/pdf/reportsPdf";
import { Button } from "@/components/ui/Button";
import type { getProductsReport } from "@/actions/reports.actions";

type Report = Awaited<ReturnType<typeof getProductsReport>>;

export function ExportProductsReportButtons({ report }: { report: Report }) {
  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        report.gananciaPorProducto.map((p) => ({
          Producto: p.name,
          "Cant. vendida": p.quantity,
          Ingresos: p.revenue,
          Ganancia: p.profit,
        }))
      ),
      "Ganancia por producto"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(report.stockActual.map((p) => ({ Producto: p.name, Stock: p.stock, "Stock mínimo": p.minStock }))),
      "Stock actual"
    );
    XLSX.writeFile(wb, `reporte_productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPdf = async () => {
    await downloadTablePdf(
      "Reporte de productos y ganancias",
      ["Producto", "Cant. vendida", "Ingresos", "Ganancia"],
      report.gananciaPorProducto.map((p) => [p.name, p.quantity, `S/ ${p.revenue.toFixed(2)}`, `S/ ${p.profit.toFixed(2)}`]),
      `reporte_productos_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={handleExportExcel}>⬇ Excel</Button>
      <Button variant="secondary" onClick={handleExportPdf}>⬇ PDF</Button>
    </div>
  );
}
