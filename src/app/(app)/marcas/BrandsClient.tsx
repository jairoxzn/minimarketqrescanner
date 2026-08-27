"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandSchema, type BrandInput } from "@/lib/validations/brand.schema";
import { createBrand, deleteBrand, listBrands, updateBrand } from "@/actions/brands.actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Brand = Awaited<ReturnType<typeof listBrands>>[number];

export function BrandsClient({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const refresh = async () => setBrands(await listBrands());

  const handleDelete = async (b: Brand) => {
    const ok = await confirm("Eliminar marca", `¿Eliminar "${b.name}"?`, true);
    if (!ok) return;
    try {
      await deleteBrand(b.id);
      toast.success("Marca eliminada");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Marcas</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>+ Nueva marca</Button>
      </div>

      {brands.length === 0 ? (
        <EmptyState title="Sin marcas" description="Crea tu primera marca." action={<Button onClick={() => setModalOpen(true)}>+ Nueva marca</Button>} />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Nombre</Th>
              <Th>Productos</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {brands.map((b) => (
              <Tr key={b.id}>
                <Td className="font-medium">{b.name}</Td>
                <Td><Badge>{b._count.products}</Badge></Td>
                <Td>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="secondary" onClick={() => { setEditing(b); setModalOpen(true); }}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(b)}>Eliminar</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <BrandFormModal
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

function BrandFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Brand | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BrandInput>({
    resolver: zodResolver(brandSchema),
    values: editing ? { id: editing.id, name: editing.name } : { name: "" },
  });

  const onSubmit = async (data: BrandInput) => {
    try {
      if (editing) {
        await updateBrand({ ...data, id: editing.id });
        toast.success("Marca actualizada");
      } else {
        await createBrand(data);
        toast.success("Marca creada");
      }
      reset();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar marca" : "Nueva marca"} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Nombre" required error={errors.name?.message} {...register("name")} />
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
