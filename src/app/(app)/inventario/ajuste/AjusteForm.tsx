"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addStockEntry, adjustStockTo } from "@/actions/inventory.actions";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface ProductOption {
  id: string;
  name: string;
  stock: number;
  unit: string;
}

export function AjusteForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"ENTRADA" | "AJUSTE">("ENTRADA");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [newStock, setNewStock] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selected = products.find((p) => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Selecciona un producto");
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === "ENTRADA") {
        const qty = Number(quantity);
        if (!qty || qty <= 0) throw new Error("Ingresa una cantidad válida");
        await addStockEntry(productId, qty, reason);
        toast.success("Entrada registrada correctamente");
      } else {
        const value = Number(newStock);
        if (Number.isNaN(value) || value < 0) throw new Error("Ingresa un stock válido");
        await adjustStockTo(productId, value, reason);
        toast.success("Ajuste registrado correctamente");
      }
      router.push("/inventario");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={mode === "ENTRADA" ? "primary" : "secondary"} onClick={() => setMode("ENTRADA")} className="flex-1 min-w-[10rem]">
              Entrada de mercadería
            </Button>
            <Button type="button" variant={mode === "AJUSTE" ? "primary" : "secondary"} onClick={() => setMode("AJUSTE")} className="flex-1 min-w-[10rem]">
              Ajuste (conteo físico)
            </Button>
          </div>

          <Select label="Producto" required value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Selecciona un producto…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (stock: {p.stock} {p.unit})</option>
            ))}
          </Select>

          {mode === "ENTRADA" ? (
            <Input
              label="Cantidad a ingresar"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              hint={selected ? `Stock actual: ${selected.stock} ${selected.unit}` : undefined}
            />
          ) : (
            <Input
              label="Nuevo stock exacto"
              type="number"
              min="0"
              required
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              hint={selected ? `Stock actual: ${selected.stock} ${selected.unit}` : undefined}
            />
          )}

          <Textarea
            label="Motivo"
            required={mode === "AJUSTE"}
            placeholder={mode === "ENTRADA" ? "Ej. Compra a proveedor" : "Ej. Conteo físico mensual"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>Registrar</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
