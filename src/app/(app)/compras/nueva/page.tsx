import { listSuppliers } from "@/actions/suppliers.actions";
import { listProducts } from "@/actions/products.actions";
import { NuevaCompraClient } from "./NuevaCompraClient";

export default async function NuevaCompraPage() {
  const [suppliers, products] = await Promise.all([
    listSuppliers(false),
    listProducts({ status: "active" }),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h1 className="text-xl font-bold text-foreground">Nueva compra</h1>
      <NuevaCompraClient
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name, purchasePrice: Number(p.purchasePrice), unit: p.unit }))}
      />
    </div>
  );
}
