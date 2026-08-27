import Link from "next/link";
import { listCashRegisterHistory } from "@/actions/cash.actions";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";

export default async function CajaHistorialPage() {
  const registers = await listCashRegisterHistory();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Historial de caja</h1>
        <Link href="/caja"><Button variant="secondary">Volver a Caja</Button></Link>
      </div>

      {registers.length === 0 ? (
        <EmptyState title="Sin cierres de caja registrados" icon="💰" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Apertura</Th>
              <Th>Cierre</Th>
              <Th>Abierta por</Th>
              <Th>Cerrada por</Th>
              <Th>Esperado</Th>
              <Th>Contado</Th>
              <Th>Diferencia</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {registers.map((r) => {
              const diff = Number(r.difference ?? 0);
              return (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap" suppressHydrationWarning>{formatDateTime(r.openedAt)}</Td>
                  <Td className="whitespace-nowrap" suppressHydrationWarning>{r.closedAt ? formatDateTime(r.closedAt) : "—"}</Td>
                  <Td>{r.openedBy.name}</Td>
                  <Td>{r.closedBy?.name ?? "—"}</Td>
                  <Td>{formatMoney(Number(r.expectedAmount ?? 0))}</Td>
                  <Td>{formatMoney(Number(r.countedAmount ?? 0))}</Td>
                  <Td>
                    <Badge tone={diff === 0 ? "success" : diff > 0 ? "info" : "danger"}>
                      {diff > 0 ? "+" : ""}{formatMoney(diff)}
                    </Badge>
                  </Td>
                  <Td><Link href={`/caja/historial/${r.id}`} className="text-primary text-sm hover:underline">Ver detalle</Link></Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
