"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createReturn, findSaleForReturn, getSaleForReturn } from "@/actions/returns.actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";
import { formatTicketLabel } from "@/lib/ticket";

type SaleSearchResult = Awaited<ReturnType<typeof findSaleForReturn>>[number];
type SaleForReturn = NonNullable<Awaited<ReturnType<typeof getSaleForReturn>>>;

export function NuevaDevolucionClient({ initialSaleId }: { initialSaleId?: string }) {
  const router = useRouter();
  const toast = useToast();

  const [saleId, setSaleId] = useState(initialSaleId ?? null);
  const [saleData, setSaleData] = useState<SaleForReturn | null>(null);
  const [loadingSale, setLoadingSale] = useState(!!initialSaleId);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SaleSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!saleId) return;
    setLoadingSale(true);
    getSaleForReturn(saleId)
      .then((data) => {
        if (!data) {
          toast.error("Venta no encontrada o ya anulada");
          setSaleId(null);
          return;
        }
        setSaleData(data);
      })
      .finally(() => setLoadingSale(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      setResults(await findSaleForReturn(query));
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleData) return;
    const items = Object.entries(quantities)
      .map(([saleItemId, qty]) => ({ saleItemId, quantity: Number(qty) || 0 }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      toast.error("Ingresa al menos una cantidad a devolver");
      return;
    }
    if (!reason.trim()) {
      toast.error("El motivo es obligatorio");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createReturn({ saleId: saleData.sale.id, reason, items });
      toast.success("Devolución registrada — inventario actualizado");
      router.push(`/devoluciones/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar la devolución");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!saleId) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Buscar por N° de ticket o nombre de cliente…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" isLoading={searching}>Buscar</Button>
          </form>

          {results.length > 0 && (
            <Table>
              <Thead><Tr><Th>Ticket</Th><Th>Cliente</Th><Th>Total</Th><Th></Th></Tr></Thead>
              <Tbody>
                {results.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-medium">{formatTicketLabel(s.ticketSeries, s.ticketNumber)}</Td>
                    <Td>{s.customer.name}</Td>
                    <Td>{formatMoney(Number(s.total))}</Td>
                    <Td><Button size="sm" onClick={() => setSaleId(s.id)}>Seleccionar</Button></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          {results.length === 0 && query && !searching && (
            <p className="text-sm text-muted">No se encontraron ventas activas que coincidan.</p>
          )}
        </CardBody>
      </Card>
    );
  }

  if (loadingSale || !saleData) {
    return <p className="text-sm text-muted">Cargando venta…</p>;
  }

  const { sale, items } = saleData;
  const anyReturnable = items.some((i) => i.returnable > 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            Venta <strong>{formatTicketLabel(sale.ticketSeries, sale.ticketNumber)}</strong> — {sale.customer.name}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={() => { setSaleId(null); setSaleData(null); setQuantities({}); }}>
            Cambiar venta
          </Button>
        </CardBody>
      </Card>

      {!anyReturnable ? (
        <p className="text-sm text-muted">Todos los productos de esta venta ya fueron devueltos.</p>
      ) : (
        <Table>
          <Thead>
            <Tr><Th>Producto</Th><Th>Vendido</Th><Th>Ya devuelto</Th><Th>Cantidad a devolver</Th></Tr>
          </Thead>
          <Tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td>{item.productName}</Td>
                <Td>{item.quantity}</Td>
                <Td>{item.alreadyReturned}</Td>
                <Td>
                  <Input
                    type="number"
                    min="0"
                    max={item.returnable}
                    disabled={item.returnable <= 0}
                    className="w-24"
                    value={quantities[item.id] ?? ""}
                    onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Textarea label="Motivo de la devolución" required value={reason} onChange={(e) => setReason(e.target.value)} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/devoluciones")}>Cancelar</Button>
        <Button type="submit" isLoading={isSubmitting} disabled={!anyReturnable}>Registrar devolución</Button>
      </div>
    </form>
  );
}
