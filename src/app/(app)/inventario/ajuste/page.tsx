import { listInventoryOverview } from "@/actions/inventory.actions";
import { AjusteForm } from "./AjusteForm";

export default async function AjusteInventarioPage() {
  const products = await listInventoryOverview();
  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h1 className="text-xl font-bold text-foreground">Entrada / Ajuste de inventario</h1>
      <AjusteForm products={products.map((p) => ({ id: p.id, name: p.name, stock: p.stock, unit: p.unit }))} />
    </div>
  );
}
