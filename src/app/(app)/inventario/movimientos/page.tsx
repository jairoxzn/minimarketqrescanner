import Link from "next/link";
import { listInventoryMovements } from "@/actions/inventory.actions";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";

const TYPE_LABEL: Record<string, string> = { ENTRADA: "Entrada", SALIDA: "Salida", AJUSTE: "Ajuste" };
const TYPE_TONE: Record<string, "success" | "danger" | "warning"> = {
  ENTRADA: "success",
  SALIDA: "danger",
  AJUSTE: "warning",
};

export default async function MovimientosInventarioPage() {
  const movements = await listInventoryMovements();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Movimientos de inventario</h1>
        <Link href="/inventario"><Button variant="secondary">Volver</Button></Link>
      </div>

      {movements.length === 0 ? (
        <EmptyState title="Sin movimientos registrados" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Fecha</Th>
              <Th>Producto</Th>
              <Th>Tipo</Th>
              <Th>Cantidad</Th>
              <Th>Stock anterior</Th>
              <Th>Stock nuevo</Th>
              <Th>Motivo</Th>
              <Th>Usuario</Th>
            </Tr>
          </Thead>
          <Tbody>
            {movements.map((m) => (
              <Tr key={m.id}>
                <Td className="whitespace-nowrap">{formatDateTime(m.createdAt)}</Td>
                <Td className="font-medium">{m.product.name}</Td>
                <Td><Badge tone={TYPE_TONE[m.type]}>{TYPE_LABEL[m.type]}</Badge></Td>
                <Td className={m.quantity < 0 ? "text-danger" : "text-emerald-700"}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </Td>
                <Td>{m.previousStock}</Td>
                <Td>{m.newStock}</Td>
                <Td className="max-w-xs truncate">{m.reason ?? "—"}</Td>
                <Td>{m.user.name}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
