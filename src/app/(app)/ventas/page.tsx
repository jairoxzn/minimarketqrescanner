import { listSales, type SaleFilters } from "@/actions/sales.actions";
import { VentasClient } from "./VentasClient";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const filters: SaleFilters = {
    search: sp.search,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    status: (sp.status as SaleFilters["status"]) || "all",
  };
  const sales = await listSales(filters);

  return <VentasClient initialSales={sales} initialFilters={filters} />;
}
