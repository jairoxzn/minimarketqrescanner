"use client";

import type { CartLine } from "./types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/money";

export function CartPanel({
  lines,
  discount,
  onDiscountChange,
  onQuantityChange,
  onRemove,
  onCheckout,
  showTitle = true,
  checkoutDisabled = false,
  checkoutDisabledReason,
}: {
  lines: CartLine[];
  discount: number;
  onDiscountChange: (value: number) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  /** Oculta el encabezado "Carrito" cuando el contenedor ya provee un título (ej. el Modal móvil). */
  showTitle?: boolean;
  /** Ej. no hay caja abierta — bloquea el cobro aunque el carrito tenga productos. */
  checkoutDisabled?: boolean;
  checkoutDisabledReason?: string;
}) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="flex flex-col h-full">
      {showTitle && <h2 className="text-sm font-semibold text-foreground px-1 mb-2">Carrito</h2>}

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
        {lines.length === 0 && (
          <p className="text-sm text-muted text-center py-8">El carrito está vacío. Agrega productos para comenzar.</p>
        )}
        {lines.map((line) => (
          <div key={line.productId} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{line.name}</p>
              <p className="text-xs text-muted">{formatMoney(line.unitPrice)} c/u</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onQuantityChange(line.productId, line.quantity - 1)}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-slate-50"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange(line.productId, line.quantity + 1)}
                disabled={line.quantity >= line.stock}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-slate-50 disabled:opacity-40"
              >
                +
              </button>
            </div>
            <p className="w-20 text-right text-sm font-semibold text-foreground">
              {formatMoney(line.unitPrice * line.quantity)}
            </p>
            <button
              type="button"
              onClick={() => onRemove(line.productId)}
              aria-label="Quitar"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-danger hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3 mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-medium text-foreground">{formatMoney(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted shrink-0">Descuento</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={discount || ""}
            onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
            className="h-9 text-right"
          />
        </div>
        <div className="flex items-center justify-between text-lg font-bold text-foreground">
          <span>TOTAL</span>
          <span>{formatMoney(total)}</span>
        </div>
        {checkoutDisabled && checkoutDisabledReason && (
          <p className="text-xs text-danger text-center">{checkoutDisabledReason}</p>
        )}
        <Button size="lg" className="mt-2" disabled={lines.length === 0 || checkoutDisabled} onClick={onCheckout}>
          Finalizar venta
        </Button>
      </div>
    </div>
  );
}
