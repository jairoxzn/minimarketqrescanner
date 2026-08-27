"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { formatMoney } from "@/lib/money";
import type { listCustomers } from "@/actions/customers.actions";
import type { listPaymentMethods } from "@/actions/paymentMethods.actions";

type Customer = Awaited<ReturnType<typeof listCustomers>>[number];
type PaymentMethod = Awaited<ReturnType<typeof listPaymentMethods>>[number];

export function PaymentModal({
  open,
  onClose,
  total,
  customers,
  paymentMethods,
  customerId,
  onCustomerChange,
  onAddCustomer,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  customers: Customer[];
  paymentMethods: PaymentMethod[];
  customerId: string;
  onCustomerChange: (id: string) => void;
  onAddCustomer: () => void;
  onConfirm: (paymentMethodId: string, amountReceived?: number) => void;
  isSubmitting: boolean;
}) {
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [amountReceivedStr, setAmountReceivedStr] = useState("");

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId);
  const isCash = selectedMethod?.code === "efectivo";
  const amountReceived = Number(amountReceivedStr) || 0;
  const change = useMemo(() => (isCash ? Math.max(0, amountReceived - total) : 0), [isCash, amountReceived, total]);

  const canConfirm = paymentMethodId && (!isCash || amountReceived >= total);

  return (
    <Modal open={open} onClose={onClose} title="Finalizar venta">
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <Select label="Cliente" value={customerId} onChange={(e) => onCustomerChange(e.target.value)} className="flex-1">
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.isGeneral ? "Cliente General" : c.name}</option>
            ))}
          </Select>
          <Button type="button" variant="secondary" onClick={onAddCustomer}>+ Nuevo</Button>
        </div>

        <Select label="Método de pago" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
          {paymentMethods.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>

        {isCash && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto recibido (S/)"
              type="number"
              step="0.01"
              min="0"
              value={amountReceivedStr}
              onChange={(e) => setAmountReceivedStr(e.target.value)}
            />
            <div className="flex flex-col justify-end">
              <span className="text-sm text-muted">Vuelto</span>
              <span className="text-lg font-bold text-foreground">{formatMoney(change)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xl font-bold text-foreground border-t border-border pt-3">
          <span>TOTAL</span>
          <span>{formatMoney(total)}</span>
        </div>

        <Button
          size="lg"
          disabled={!canConfirm}
          isLoading={isSubmitting}
          onClick={() => onConfirm(paymentMethodId, isCash ? amountReceived : undefined)}
        >
          Confirmar venta
        </Button>
      </div>
    </Modal>
  );
}
