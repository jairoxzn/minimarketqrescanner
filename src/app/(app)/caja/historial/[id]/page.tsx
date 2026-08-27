import { notFound } from "next/navigation";
import Link from "next/link";
import { getCashRegisterDetail } from "@/actions/cash.actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";

const MOVEMENT_LABEL: Record<string, string> = { INGRESO: "Ingreso", EGRESO: "Egreso", RETIRO: "Retiro" };
const MOVEMENT_TONE: Record<string, "success" | "danger" | "warning"> = {
  INGRESO: "success",
  EGRESO: "danger",
  RETIRO: "warning",
};

export default async function CajaHistorialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const register = await getCashRegisterDetail(id);
  if (!register) notFound();

  const diff = Number(register.difference ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Cierre de caja</h1>
        <Link href="/caja/historial"><Button variant="secondary">Volver</Button></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardBody><p className="text-sm text-muted">Abierta por</p><p className="font-medium text-foreground">{register.openedBy.name}</p><p className="text-xs text-muted" suppressHydrationWarning>{formatDateTime(register.openedAt)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Cerrada por</p><p className="font-medium text-foreground">{register.closedBy?.name ?? "—"}</p><p className="text-xs text-muted" suppressHydrationWarning>{register.closedAt ? formatDateTime(register.closedAt) : "—"}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Monto inicial</p><p className="text-xl font-bold text-foreground">{formatMoney(Number(register.openingAmount))}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Diferencia</p><p className={`text-xl font-bold ${diff === 0 ? "text-emerald-700" : diff > 0 ? "text-primary" : "text-danger"}`}>{diff > 0 ? "+" : ""}{formatMoney(diff)}</p></CardBody></Card>
      </div>

      <Card className="max-w-sm">
        <CardBody className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Total esperado</span><span>{formatMoney(Number(register.expectedAmount ?? 0))}</span></div>
          <div className="flex justify-between font-semibold"><span>Dinero contado</span><span>{formatMoney(Number(register.countedAmount ?? 0))}</span></div>
          {register.notes && <p className="text-muted pt-2 border-t border-border">Notas: {register.notes}</p>}
        </CardBody>
      </Card>

      <h2 className="text-sm font-semibold text-foreground">Movimientos</h2>
      {register.movements.length === 0 ? (
        <EmptyState title="Sin movimientos en esta caja" icon="💰" />
      ) : (
        <Table>
          <Thead><Tr><Th>Fecha</Th><Th>Tipo</Th><Th>Monto</Th><Th>Motivo</Th><Th>Usuario</Th></Tr></Thead>
          <Tbody>
            {register.movements.map((m) => (
              <Tr key={m.id}>
                <Td className="whitespace-nowrap" suppressHydrationWarning>{formatDateTime(m.createdAt)}</Td>
                <Td><Badge tone={MOVEMENT_TONE[m.type]}>{MOVEMENT_LABEL[m.type]}</Badge></Td>
                <Td>{formatMoney(Number(m.amount))}</Td>
                <Td className="max-w-xs truncate">{m.reason}</Td>
                <Td>{m.user.name}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
