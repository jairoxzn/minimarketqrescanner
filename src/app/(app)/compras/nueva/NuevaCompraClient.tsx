"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchase } from "@/actions/purchases.actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";

interface ProductOption {
  id: string;
  name: string;
  purchasePrice: number;
  unit: string;
}

interface Line {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

export function NuevaCompraClient({
  suppliers,
  products,
}: {
  suppliers: { id: string; name: string }[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [receiveNow, setReceiveNow] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = productQuery
    ? products.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase()))
    : [];

  const addLine = (product: ProductOption) => {
    setProductQuery("");
    setLines((prev) => {
      if (prev.some((l) => l.productId === product.id)) return prev;
      return [...prev, { productId: product.id, name: product.name, unit: product.unit, quantity: 1, unitCost: product.purchasePrice }];
    });
  };

  const updateLine = (productId: string, field: "quantity" | "unitCost", value: number) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, [field]: value } : l)));
  };

  const removeLine = (productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId));

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Selecciona un proveedor");
      return;
    }
    if (lines.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    setIsSubmitting(true);
    try {
      const purchase = await createPurchase({
        supplierId,
        invoiceNumber,
        notes,
        receiveNow,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      });
      toast.success(receiveNow ? "Compra registrada y stock actualizado" : "Compra registrada como pendiente");
      router.push(`/compras/${purchase.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar la compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <Select label="Proveedor" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.length === 0 && <option value="">No hay proveedores — crea uno primero</option>}
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="N° Factura / Guía (opcional)" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <Textarea label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Productos</h2>
          <div className="relative">
            <Input
              placeholder="Buscar producto por nombre…"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />
            {filteredProducts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addLine(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    {p.name} <span className="text-muted">({formatMoney(p.purchasePrice)} c/u actual)</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="text-sm text-muted">Aún no agregaste productos.</p>
          ) : (
            <Table>
              <Thead>
                <Tr><Th>Producto</Th><Th>Cantidad</Th><Th>Costo unit. (S/)</Th><Th>Subtotal</Th><Th></Th></Tr>
              </Thead>
              <Tbody>
                {lines.map((l) => (
                  <Tr key={l.productId}>
                    <Td>{l.name}</Td>
                    <Td>
                      <Input
                        type="number"
                        min="1"
                        className="w-20"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.productId, "quantity", Number(e.target.value) || 1)}
                      />
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24"
                        value={l.unitCost}
                        onChange={(e) => updateLine(l.productId, "unitCost", Number(e.target.value) || 0)}
                      />
                    </Td>
                    <Td>{formatMoney(l.quantity * l.unitCost)}</Td>
                    <Td>
                      <button type="button" onClick={() => removeLine(l.productId)} className="text-danger text-sm hover:underline">
                        Quitar
                      </button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}

          <div className="flex justify-end text-lg font-bold text-foreground pt-2 border-t border-border">
            Total: {formatMoney(total)}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-border" checked={receiveNow} onChange={(e) => setReceiveNow(e.target.checked)} />
            Recibir mercadería ahora (actualiza el stock y el precio de compra de los productos de inmediato)
          </label>
          {!receiveNow && (
            <p className="text-xs text-muted mt-2">
              Si lo dejas sin marcar, la compra queda "Pendiente" — el stock se actualizará cuando la marques como recibida desde el detalle.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" isLoading={isSubmitting}>Registrar compra</Button>
      </div>
    </form>
  );
}
