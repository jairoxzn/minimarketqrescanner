import { notFound } from "next/navigation";
import Link from "next/link";
import { getReturn } from "@/actions/returns.actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { formatTicketLabel } from "@/lib/ticket";

export default async function DevolucionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ret = await getReturn(id);
  if (!ret) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Devolución</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/ventas/${ret.saleId}`}><Button variant="secondary">Ver venta original</Button></Link>
          <Link href="/devoluciones"><Button variant="secondary">Volver</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardBody><p className="text-sm text-muted">Venta</p><p className="font-medium text-foreground">{formatTicketLabel(ret.sale.ticketSeries, ret.sale.ticketNumber)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Cliente</p><p className="font-medium text-foreground">{ret.sale.customer.name}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Fecha</p><p className="font-medium text-foreground" suppressHydrationWarning>{formatDateTime(ret.createdAt)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Registrada por</p><p className="font-medium text-foreground">{ret.user.name}</p></CardBody></Card>
      </div>

      <Card className="max-w-md">
        <CardBody className="text-sm">
          <p className="text-muted">Motivo</p>
          <p className="font-medium text-foreground">{ret.reason}</p>
        </CardBody>
      </Card>

      <Table>
        <Thead><Tr><Th>Producto</Th><Th>Cantidad</Th><Th>Precio unit.</Th><Th>Subtotal</Th></Tr></Thead>
        <Tbody>
          {ret.items.map((item) => (
            <Tr key={item.id}>
              <Td>{item.product.name}</Td>
              <Td>{item.quantity}</Td>
              <Td>{formatMoney(Number(item.unitPrice))}</Td>
              <Td>{formatMoney(Number(item.subtotal))}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Card className="max-w-sm ml-auto w-full">
        <CardBody className="flex justify-between text-base font-bold">
          <span>Total devuelto</span>
          <span>{formatMoney(Number(ret.totalAmount))}</span>
        </CardBody>
      </Card>
    </div>
  );
}
