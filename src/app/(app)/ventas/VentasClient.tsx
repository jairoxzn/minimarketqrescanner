"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { listSales, type SaleFilters } from "@/actions/sales.actions";
import { Input, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";

type Sale = Awaited<ReturnType<typeof listSales>>[number];

export function VentasClient({
  initialSales,
  initialFilters,
}: {
  initialSales: Sale[];
  initialFilters: SaleFilters;
}) {
  const [sales, setSales] = useState(initialSales);
  const [filters, setFilters] = useState(initialFilters);
  const [isPending, startTransition] = useTransition();

  const applyFilters = (next: SaleFilters) => {
    setFilters(next);
    startTransition(async () => setSales(await listSales(next)));
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Ventas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-border">
        <Input
          placeholder="Buscar por N° ticket o cliente…"
          defaultValue={filters.search}
          onChange={(e) => applyFilters({ ...filters, search: e.target.value })}
        />
        <Input type="date" value={filters.dateFrom ?? ""} onChange={(e) => applyFilters({ ...filters, dateFrom: e.target.value })} />
        <Input type="date" value={filters.dateTo ?? ""} onChange={(e) => applyFilters({ ...filters, dateTo: e.target.value })} />
        <Select value={filters.status || "all"} onChange={(e) => applyFilters({ ...filters, status: e.target.value as SaleFilters["status"] })}>
          <option value="all">Todos los estados</option>
          <option value="ACTIVE">Activas</option>
          <option value="VOID">Anuladas</option>
        </Select>
      </div>

      {sales.length === 0 ? (
        <EmptyState title="Sin ventas registradas" />
      ) : (
        <Table className={isPending ? "opacity-60" : ""}>
          <Thead>
            <Tr>
              <Th>Ticket</Th>
              <Th>Fecha</Th>
              <Th>Cliente</Th>
              <Th>Usuario</Th>
              <Th>Método de pago</Th>
              <Th>Total</Th>
              <Th>Estado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {sales.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{s.ticketSeries}-{String(s.ticketNumber).padStart(6, "0")}</Td>
                <Td className="whitespace-nowrap">{s.createdAt.toLocaleString("es-PE")}</Td>
                <Td>{s.customer.name}</Td>
                <Td>{s.user.name}</Td>
                <Td>{s.payments.map((p) => p.paymentMethod.name).join(" + ")}</Td>
                <Td>{formatMoney(Number(s.total))}</Td>
                <Td><Badge tone={s.status === "ACTIVE" ? "success" : "danger"}>{s.status === "ACTIVE" ? "Activa" : "Anulada"}</Badge></Td>
                <Td>
                  <Link href={`/ventas/${s.id}`}><Button size="sm" variant="secondary">Ver</Button></Link>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
