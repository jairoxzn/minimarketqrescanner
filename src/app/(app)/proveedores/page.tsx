import { listSuppliers } from "@/actions/suppliers.actions";
import { ProveedoresClient } from "./ProveedoresClient";

export default async function ProveedoresPage() {
  const suppliers = await listSuppliers();
  return <ProveedoresClient initialSuppliers={suppliers} />;
}
