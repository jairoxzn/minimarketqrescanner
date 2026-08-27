import { listCustomers } from "@/actions/customers.actions";
import { ClientesClient } from "./ClientesClient";

export default async function ClientesPage() {
  const customers = await listCustomers();
  return <ClientesClient initialCustomers={customers} />;
}
