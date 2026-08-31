import { notFound } from "next/navigation";
import Link from "next/link";
import { getSale } from "@/actions/sales.actions";
import { getCurrentSession } from "@/lib/session";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { formatTicketLabel } from "@/lib/ticket";
import { VoidSaleButton } from "./VoidSaleButton";

export default async function VentaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, session] = await Promise.all([getSale(id), getCurrentSession()]);
  if (!sale) notFound();

  const isAdmin = session?.user.role === "ADMIN";
  const ticketLabel = formatTicketLabel(sale.ticketSeries, sale.ticketNumber);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Venta {ticketLabel}</h1>
          <Badge tone={sale.status === "ACTIVE" ? "success" : "danger"}>{sale.status === "ACTIVE" ? "Activa" : "Anulada"}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/ventas/${sale.id}/ticket`}><Button variant="secondary">🖨️ Ver / Reimprimir ticket</Button></Link>
          {sale.status === "ACTIVE" && <Link href={`/devoluciones/nueva?saleId=${sale.id}`}><Button variant="secondary">↩️ Registrar devolución</Button></Link>}
          {isAdmin && sale.status === "ACTIVE" && <VoidSaleButton saleId={sale.id} />}
          <Link href="/ventas"><Button variant="secondary">Volver</Button></Link>
        </div>
      </div>

      {sale.status === "VOID" && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-sm text-danger px-4 py-3">
          Anulada por {sale.voidedBy?.name} el {sale.voidedAt && formatDateTime(sale.voidedAt)}. Motivo: {sale.voidReason}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardBody className="text-sm flex flex-col gap-1">
          <p className="text-muted">Fecha</p>
          <p className="font-medium text-foreground">{formatDateTime(sale.createdAt)}</p>
        </CardBody></Card>
        <Card><CardBody className="text-sm flex flex-col gap-1">
          <p className="text-muted">Cliente</p>
          <p className="font-medium text-foreground">{sale.customer.name}</p>
        </CardBody></Card>
        <Card><CardBody className="text-sm flex flex-col gap-1">
          <p className="text-muted">Vendedor</p>
          <p className="font-medium text-foreground">{sale.user.name}</p>
        </CardBody></Card>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Producto</Th>
            <Th>Cantidad</Th>
            <Th>Precio unit.</Th>
            <Th>Subtotal</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sale.items.map((item) => (
            <Tr key={item.id}>
              <Td>{item.productName}</Td>
              <Td>{item.quantity}</Td>
              <Td>{formatMoney(Number(item.unitPrice))}</Td>
              <Td>{formatMoney(Number(item.subtotal))}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Card className="max-w-sm ml-auto w-full">
        <CardBody className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatMoney(Number(sale.subtotal))}</span></div>
          <div className="flex justify-between"><span className="text-muted">Descuento</span><span>{formatMoney(Number(sale.discount))}</span></div>
          <div className="flex justify-between text-base font-bold"><span>TOTAL</span><span>{formatMoney(Number(sale.total))}</span></div>
          <div className="flex justify-between pt-2 border-t border-border"><span className="text-muted">Pago</span><span>{sale.payments.map((p) => p.paymentMethod.name).join(" + ")}</span></div>
          {sale.amountReceived != null && (
            <div className="flex justify-between"><span className="text-muted">Recibido</span><span>{formatMoney(Number(sale.amountReceived))}</span></div>
          )}
          {sale.changeAmount != null && (
            <div className="flex justify-between"><span className="text-muted">Vuelto</span><span>{formatMoney(Number(sale.changeAmount))}</span></div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
