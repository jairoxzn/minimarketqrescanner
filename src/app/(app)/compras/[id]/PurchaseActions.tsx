"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelPurchase, receivePurchase } from "@/actions/purchases.actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export function PurchaseActions({ purchaseId, status }: { purchaseId: string; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [updatePrices, setUpdatePrices] = useState(true);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status !== "PENDIENTE") return null;

  const handleReceive = async () => {
    setIsSubmitting(true);
    try {
      await receivePurchase(purchaseId, updatePrices);
      toast.success("Compra recibida — stock actualizado");
      setReceiveModalOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al recibir la compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("El motivo es obligatorio");
      return;
    }
    setIsSubmitting(true);
    try {
      await cancelPurchase(purchaseId, cancelReason);
      toast.success("Compra cancelada");
      setCancelModalOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cancelar la compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setReceiveModalOpen(true)}>📦 Marcar como recibida</Button>
      <Button variant="danger" onClick={() => setCancelModalOpen(true)}>Cancelar compra</Button>

      <Modal open={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} title="Recibir mercadería" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">Esto sumará el stock de cada producto y no se puede deshacer.</p>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-border" checked={updatePrices} onChange={(e) => setUpdatePrices(e.target.checked)} />
            Actualizar el precio de compra de los productos al costo de esta compra
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReceiveModalOpen(false)}>Cancelar</Button>
            <Button isLoading={isSubmitting} onClick={handleReceive}>Confirmar recepción</Button>
          </div>
        </div>
      </Modal>

      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancelar compra" size="sm">
        <div className="flex flex-col gap-4">
          <Textarea label="Motivo" required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>Volver</Button>
            <Button variant="danger" isLoading={isSubmitting} onClick={handleCancel}>Confirmar cancelación</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
