"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { listPurchases, type PurchaseFilters } from "@/actions/purchases.actions";
import { Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";

type Purchase = Awaited<ReturnType<typeof listPurchases>>[number];

const STATUS_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", RECIBIDA: "Recibida", CANCELADA: "Cancelada" };
const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  PENDIENTE: "warning",
  RECIBIDA: "success",
  CANCELADA: "danger",
};

export function ComprasClient({
  initialPurchases,
  initialFilters,
}: {
  initialPurchases: Purchase[];
  initialFilters: PurchaseFilters;
}) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [filters, setFilters] = useState(initialFilters);
  const [isPending, startTransition] = useTransition();

  const applyFilters = (next: PurchaseFilters) => {
    setFilters(next);
    startTransition(async () => setPurchases(await listPurchases(next)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Compras</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/proveedores"><Button variant="secondary">Proveedores</Button></Link>
          <Link href="/compras/nueva"><Button>+ Nueva compra</Button></Link>
        </div>
      </div>

      <div className="max-w-xs">
        <Select value={filters.status || "all"} onChange={(e) => applyFilters({ status: e.target.value as PurchaseFilters["status"] })}>
          <option value="all">Todos los estados</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="RECIBIDA">Recibidas</option>
          <option value="CANCELADA">Canceladas</option>
        </Select>
      </div>

      {purchases.length === 0 ? (
        <EmptyState title="Sin compras registradas" icon="🚚" action={<Link href="/compras/nueva"><Button>+ Nueva compra</Button></Link>} />
      ) : (
        <Table className={isPending ? "opacity-60" : ""}>
          <Thead>
            <Tr>
              <Th>Fecha</Th>
              <Th>Proveedor</Th>
              <Th>N° Factura/Guía</Th>
              <Th>Ítems</Th>
              <Th>Total</Th>
              <Th>Estado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {purchases.map((p) => (
              <Tr key={p.id}>
                <Td className="whitespace-nowrap" suppressHydrationWarning>{formatDateTime(p.createdAt)}</Td>
                <Td className="font-medium">{p.supplier.name}</Td>
                <Td>{p.invoiceNumber ?? "—"}</Td>
                <Td>{p.items.reduce((sum, i) => sum + i.quantity, 0)} unidad(es)</Td>
                <Td>{formatMoney(Number(p.total))}</Td>
                <Td><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge></Td>
                <Td><Link href={`/compras/${p.id}`} className="text-primary text-sm hover:underline">Ver detalle</Link></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
