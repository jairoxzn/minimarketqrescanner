import Link from "next/link";
import { listReturns } from "@/actions/returns.actions";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { formatTicketLabel } from "@/lib/ticket";

export default async function DevolucionesPage() {
  const returns = await listReturns();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Devoluciones</h1>
        <Link href="/devoluciones/nueva"><Button>+ Nueva devolución</Button></Link>
      </div>

      {returns.length === 0 ? (
        <EmptyState
          title="Sin devoluciones registradas"
          icon="↩️"
          action={<Link href="/devoluciones/nueva"><Button>+ Nueva devolución</Button></Link>}
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Fecha</Th>
              <Th>Venta</Th>
              <Th>Ítems</Th>
              <Th>Monto</Th>
              <Th>Motivo</Th>
              <Th>Usuario</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {returns.map((r) => (
              <Tr key={r.id}>
                <Td className="whitespace-nowrap" suppressHydrationWarning>{formatDateTime(r.createdAt)}</Td>
                <Td className="font-medium">{formatTicketLabel(r.sale.ticketSeries, r.sale.ticketNumber)}</Td>
                <Td>{r.items.reduce((sum, i) => sum + i.quantity, 0)} unidad(es)</Td>
                <Td>{formatMoney(Number(r.totalAmount))}</Td>
                <Td className="max-w-xs truncate">{r.reason}</Td>
                <Td>{r.user.name}</Td>
                <Td><Link href={`/devoluciones/${r.id}`} className="text-primary text-sm hover:underline">Ver detalle</Link></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
