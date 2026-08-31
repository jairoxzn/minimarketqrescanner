import { notFound } from "next/navigation";
import Link from "next/link";
import { getPurchase } from "@/actions/purchases.actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { PurchaseActions } from "./PurchaseActions";

const STATUS_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", RECIBIDA: "Recibida", CANCELADA: "Cancelada" };
const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  PENDIENTE: "warning",
  RECIBIDA: "success",
  CANCELADA: "danger",
};

export default async function CompraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const purchase = await getPurchase(id);
  if (!purchase) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Compra — {purchase.supplier.name}</h1>
          <Badge tone={STATUS_TONE[purchase.status]}>{STATUS_LABEL[purchase.status]}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <PurchaseActions purchaseId={purchase.id} status={purchase.status} />
          <Link href="/compras"><Button variant="secondary">Volver</Button></Link>
        </div>
      </div>

      {purchase.status === "CANCELADA" && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-sm text-danger px-4 py-3">
          Cancelada. Motivo: {purchase.cancelReason}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardBody><p className="text-sm text-muted">Fecha</p><p className="font-medium text-foreground" suppressHydrationWarning>{formatDateTime(purchase.createdAt)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">N° Factura/Guía</p><p className="font-medium text-foreground">{purchase.invoiceNumber ?? "—"}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Registrada por</p><p className="font-medium text-foreground">{purchase.user.name}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Recibida por</p><p className="font-medium text-foreground">{purchase.receivedBy?.name ?? "—"}</p></CardBody></Card>
      </div>

      {purchase.notes && (
        <Card className="max-w-md"><CardBody className="text-sm"><p className="text-muted">Notas</p><p className="text-foreground">{purchase.notes}</p></CardBody></Card>
      )}

      <Table>
        <Thead><Tr><Th>Producto</Th><Th>Cantidad</Th><Th>Costo unit.</Th><Th>Subtotal</Th></Tr></Thead>
        <Tbody>
          {purchase.items.map((item) => (
            <Tr key={item.id}>
              <Td>{item.product.name}</Td>
              <Td>{item.quantity}</Td>
              <Td>{formatMoney(Number(item.unitCost))}</Td>
              <Td>{formatMoney(Number(item.subtotal))}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Card className="max-w-sm ml-auto w-full">
        <CardBody className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatMoney(Number(purchase.total))}</span>
        </CardBody>
      </Card>
    </div>
  );
}
