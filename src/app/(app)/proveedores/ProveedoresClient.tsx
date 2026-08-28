"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { supplierSchema, type SupplierInput } from "@/lib/validations/supplier.schema";
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from "@/actions/suppliers.actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Supplier = Awaited<ReturnType<typeof listSuppliers>>[number];
type SupplierFormValues = z.input<typeof supplierSchema>;

export function ProveedoresClient({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const refresh = async () => setSuppliers(await listSuppliers());

  const handleDelete = async (s: Supplier) => {
    const ok = await confirm("Eliminar proveedor", `¿Eliminar "${s.name}"?`, true);
    if (!ok) return;
    try {
      const result = await deleteSupplier(s.id);
      toast.success(result.hardDeleted ? "Proveedor eliminado" : "Proveedor desactivado (tiene compras registradas)");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Proveedores</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>+ Nuevo proveedor</Button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState title="Sin proveedores" action={<Button onClick={() => setModalOpen(true)}>+ Nuevo proveedor</Button>} />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Nombre</Th>
              <Th>RUC</Th>
              <Th>Contacto</Th>
              <Th>Teléfono</Th>
              <Th>Compras</Th>
              <Th>Estado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {suppliers.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td>{s.ruc ?? "—"}</Td>
                <Td>{s.contactName ?? "—"}</Td>
                <Td>{s.phone ?? "—"}</Td>
                <Td><Badge>{s._count.purchases}</Badge></Td>
                <Td><Badge tone={s.active ? "success" : "default"}>{s.active ? "Activo" : "Inactivo"}</Badge></Td>
                <Td>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="secondary" onClick={() => { setEditing(s); setModalOpen(true); }}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(s)}>Eliminar</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <SupplierFormModal
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

function SupplierFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Supplier | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues, unknown, SupplierInput>({
    resolver: zodResolver(supplierSchema),
    values: editing
      ? {
          id: editing.id,
          name: editing.name,
          ruc: editing.ruc ?? "",
          contactName: editing.contactName ?? "",
          phone: editing.phone ?? "",
          email: editing.email ?? "",
          address: editing.address ?? "",
          active: editing.active,
        }
      : { name: "", ruc: "", contactName: "", phone: "", email: "", address: "", active: true },
  });

  const onSubmit = async (data: SupplierInput) => {
    try {
      if (editing) {
        await updateSupplier({ ...data, id: editing.id });
        toast.success("Proveedor actualizado");
      } else {
        await createSupplier(data);
        toast.success("Proveedor creado");
      }
      reset();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar proveedor" : "Nuevo proveedor"}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Nombre / razón social" required error={errors.name?.message} {...register("name")} />
        <Input label="RUC" error={errors.ruc?.message} {...register("ruc")} />
        <Input label="Persona de contacto" error={errors.contactName?.message} {...register("contactName")} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Teléfono" error={errors.phone?.message} {...register("phone")} />
          <Input label="Correo" type="email" error={errors.email?.message} {...register("email")} />
        </div>
        <Input label="Dirección" error={errors.address?.message} {...register("address")} />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("active")} />
          Proveedor activo
        </label>
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
