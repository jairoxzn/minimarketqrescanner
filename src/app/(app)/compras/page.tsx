import { listPurchases, type PurchaseFilters } from "@/actions/purchases.actions";
import { ComprasClient } from "./ComprasClient";

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filters: PurchaseFilters = { status: (status as PurchaseFilters["status"]) || "all" };
  const purchases = await listPurchases(filters);

  return <ComprasClient initialPurchases={purchases} initialFilters={filters} />;
}
