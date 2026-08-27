"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentMethodSchema, type PaymentMethodInput } from "@/lib/validations/paymentMethod.schema";
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  togglePaymentMethodActive,
  updatePaymentMethod,
} from "@/actions/paymentMethods.actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type PaymentMethod = Awaited<ReturnType<typeof listPaymentMethods>>[number];

export function PaymentMethodsPanel({ initialMethods }: { initialMethods: PaymentMethod[] }) {
  const [methods, setMethods] = useState(initialMethods);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const refresh = async () => setMethods(await listPaymentMethods(true));

  const handleToggle = async (m: PaymentMethod) => {
    try {
      await togglePaymentMethodActive(m.id);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const handleDelete = async (m: PaymentMethod) => {
    const ok = await confirm("Eliminar método de pago", `¿Eliminar "${m.name}"?`, true);
    if (!ok) return;
    try {
      await deletePaymentMethod(m.id);
      toast.success("Eliminado");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Métodos de pago</h2>
        <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Nuevo método</Button>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Nombre</Th>
            <Th>Código</Th>
            <Th>Estado</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {methods.map((m) => (
            <Tr key={m.id}>
              <Td className="font-medium">{m.name}</Td>
              <Td className="text-muted">{m.code}</Td>
              <Td><Badge tone={m.active ? "success" : "default"}>{m.active ? "Activo" : "Inactivo"}</Badge></Td>
              <Td>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="secondary" onClick={() => handleToggle(m)}>{m.active ? "Desactivar" : "Activar"}</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(m); setModalOpen(true); }}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(m)}>Eliminar</Button>
                </div>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <PaymentMethodModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={async () => {
          setModalOpen(false);
          await refresh();
        }}
      />
      {dialog}
    </div>
  );
}

function PaymentMethodModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: PaymentMethod | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodInput>({
    resolver: zodResolver(paymentMethodSchema),
    values: editing ? { id: editing.id, name: editing.name, code: editing.code } : { name: "", code: "" },
  });

  const onSubmit = async (data: PaymentMethodInput) => {
    try {
      if (editing) {
        await updatePaymentMethod({ ...data, id: editing.id });
        toast.success("Actualizado");
      } else {
        await createPaymentMethod(data);
        toast.success("Creado");
      }
      reset();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar método de pago" : "Nuevo método de pago"} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Nombre" required error={errors.name?.message} {...register("name")} />
        <Input label="Código" required hint="Minúsculas, sin espacios (ej. tarjeta_credito)" error={errors.code?.message} {...register("code")} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
