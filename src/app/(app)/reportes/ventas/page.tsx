import { getSalesReport } from "@/actions/reports.actions";
import { VentasReportClient } from "./VentasReportClient";

export default async function ReporteVentasPage() {
  const report = await getSalesReport();
  return <VentasReportClient initialReport={report} />;
}
