import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/actions/customers.actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { formatTicketLabel } from "@/lib/ticket";

const DOC_LABEL: Record<string, string> = { DNI: "DNI", RUC: "RUC", CE: "CE", PASSPORT: "Pasaporte", NONE: "—" };

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const totalSpent = customer.sales.reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
        <Link href="/clientes"><Button variant="secondary">Volver</Button></Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardBody className="flex flex-col gap-1 text-sm">
          <p><span className="text-muted">Documento:</span> {customer.docType !== "NONE" && customer.docNumber ? `${DOC_LABEL[customer.docType]} ${customer.docNumber}` : "—"}</p>
          <p><span className="text-muted">Teléfono:</span> {customer.phone ?? "—"}</p>
          <p><span className="text-muted">Dirección:</span> {customer.address ?? "—"}</p>
          <p><span className="text-muted">Correo:</span> {customer.email ?? "—"}</p>
        </CardBody></Card>
        <Card><CardBody className="flex flex-col gap-1">
          <p className="text-sm text-muted">Total comprado</p>
          <p className="text-2xl font-bold text-foreground">{formatMoney(totalSpent)}</p>
          <p className="text-sm text-muted">{customer.sales.length} venta(s)</p>
        </CardBody></Card>
      </div>

      <h2 className="text-sm font-semibold text-foreground">Historial de compras</h2>
      {customer.sales.length === 0 ? (
        <EmptyState title="Sin compras registradas" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Ticket</Th>
              <Th>Fecha</Th>
              <Th>Ítems</Th>
              <Th>Total</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {customer.sales.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{formatTicketLabel(s.ticketSeries, s.ticketNumber)}</Td>
                <Td>{formatDateTime(s.createdAt)}</Td>
                <Td>{s.items.length}</Td>
                <Td>{formatMoney(Number(s.total))}</Td>
                <Td>
                  <Link href={`/ventas/${s.id}`} className="text-primary text-sm hover:underline">Ver detalle</Link>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
