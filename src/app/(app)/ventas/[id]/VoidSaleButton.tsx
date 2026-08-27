"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidSale } from "@/actions/sales.actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export function VoidSaleButton({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleVoid = async () => {
    if (!reason.trim()) {
      toast.error("El motivo es obligatorio");
      return;
    }
    setIsSubmitting(true);
    try {
      await voidSale(saleId, reason);
      toast.success("Venta anulada. El stock fue restituido.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al anular la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Anular venta</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Anular venta" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            Esta acción revertirá el stock de los productos vendidos y no se puede deshacer.
          </p>
          <Textarea label="Motivo de la anulación" required value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="danger" isLoading={isSubmitting} onClick={handleVoid}>Confirmar anulación</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
