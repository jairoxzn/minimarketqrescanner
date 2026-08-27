"use client";

import { useState } from "react";
import { createCustomer } from "@/actions/customers.actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type CreatedCustomer = Awaited<ReturnType<typeof createCustomer>>;

export function QuickAddCustomerModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CreatedCustomer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setIsSubmitting(true);
    try {
      const customer = await createCustomer({
        name,
        phone,
        docNumber,
        docType: docNumber ? "DNI" : "NONE",
        address: "",
        email: "",
      });
      toast.success("Cliente creado");
      onCreated(customer);
      setName("");
      setPhone("");
      setDocNumber("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="DNI (opcional)" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
        <Input label="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Crear cliente</Button>
        </div>
      </form>
    </Modal>
  );
}
