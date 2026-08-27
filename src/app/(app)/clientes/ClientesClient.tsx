"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer.schema";

type CustomerFormValues = z.input<typeof customerSchema>;
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from "@/actions/customers.actions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Customer = Awaited<ReturnType<typeof listCustomers>>[number];

const DOC_LABEL: Record<string, string> = { DNI: "DNI", RUC: "RUC", CE: "CE", PASSPORT: "Pasaporte", NONE: "—" };

export function ClientesClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const refresh = (q: string) =>
    startTransition(async () => setCustomers(await listCustomers(q)));

  const handleSearch = (value: string) => {
    setSearch(value);
    refresh(value);
  };

  const handleDelete = async (c: Customer) => {
    const ok = await confirm("Eliminar cliente", `¿Eliminar "${c.name}"?`, true);
    if (!ok) return;
    try {
      await deleteCustomer(c.id);
      toast.success("Cliente eliminado");
      refresh(search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Clientes</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>+ Nuevo cliente</Button>
      </div>

      <Input placeholder="Buscar por nombre, documento o teléfono…" value={search} onChange={(e) => handleSearch(e.target.value)} />

      {customers.length === 0 ? (
        <EmptyState title="Sin clientes" action={<Button onClick={() => setModalOpen(true)}>+ Nuevo cliente</Button>} />
      ) : (
        <Table className={isPending ? "opacity-60" : ""}>
          <Thead>
            <Tr>
              <Th>Nombre</Th>
              <Th>Documento</Th>
              <Th>Teléfono</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {customers.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium">
                  <Link href={`/clientes/${c.id}`} className="hover:text-primary hover:underline">{c.name}</Link>
                  {c.isGeneral && <Badge className="ml-2">General</Badge>}
                </Td>
                <Td>{c.docType !== "NONE" && c.docNumber ? `${DOC_LABEL[c.docType]} ${c.docNumber}` : "—"}</Td>
                <Td>{c.phone ?? "—"}</Td>
                <Td>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="secondary" onClick={() => { setEditing(c); setModalOpen(true); }}>Editar</Button>
                    {!c.isGeneral && <Button size="sm" variant="danger" onClick={() => handleDelete(c)}>Eliminar</Button>}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={() => {
          setModalOpen(false);
          refresh(search);
        }}
      />
      {dialog}
    </div>
  );
}

function CustomerFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Customer | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues, unknown, CustomerInput>({
    resolver: zodResolver(customerSchema),
    values: editing
      ? {
          id: editing.id,
          name: editing.name,
          docType: editing.docType,
          docNumber: editing.docNumber ?? "",
          phone: editing.phone ?? "",
          address: editing.address ?? "",
          email: editing.email ?? "",
        }
      : { name: "", docType: "NONE", docNumber: "", phone: "", address: "", email: "" },
  });

  const docType = watch("docType");

  const onSubmit = async (data: CustomerInput) => {
    try {
      if (editing) {
        await updateCustomer({ ...data, id: editing.id });
        toast.success("Cliente actualizado");
      } else {
        await createCustomer(data);
        toast.success("Cliente creado");
      }
      reset();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar cliente" : "Nuevo cliente"}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Nombre completo / razón social" required error={errors.name?.message} {...register("name")} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tipo de documento" {...register("docType")}>
            <option value="NONE">Sin documento</option>
            <option value="DNI">DNI</option>
            <option value="RUC">RUC</option>
            <option value="CE">Carné de extranjería</option>
            <option value="PASSPORT">Pasaporte</option>
          </Select>
          <Input
            label="Número de documento"
            disabled={docType === "NONE"}
            error={errors.docNumber?.message}
            {...register("docNumber")}
          />
        </div>
        <Input label="Teléfono" error={errors.phone?.message} {...register("phone")} />
        <Input label="Dirección" error={errors.address?.message} {...register("address")} />
        <Input label="Correo electrónico" type="email" error={errors.email?.message} {...register("email")} />
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
