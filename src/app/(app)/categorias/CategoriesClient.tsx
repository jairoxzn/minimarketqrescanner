"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryInput } from "@/lib/validations/category.schema";
import { createCategory, deleteCategory, listCategories, updateCategory } from "@/actions/categories.actions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Category = Awaited<ReturnType<typeof listCategories>>[number];

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const topLevel = categories.filter((c) => !c.parentId);

  const refresh = async () => setCategories(await listCategories());

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleDelete = async (c: Category) => {
    const ok = await confirm("Eliminar categoría", `¿Eliminar "${c.name}"? Esta acción no se puede deshacer.`, true);
    if (!ok) return;
    try {
      await deleteCategory(c.id);
      toast.success("Categoría eliminada");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Categorías</h1>
        <Button onClick={openCreate}>+ Nueva categoría</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="Sin categorías" description="Crea tu primera categoría para organizar tus productos." action={<Button onClick={openCreate}>+ Nueva categoría</Button>} />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Nombre</Th>
              <Th>Categoría padre</Th>
              <Th>Productos</Th>
              <Th>Subcategorías</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {categories.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium">{c.name}</Td>
                <Td>{c.parent ? c.parent.name : <span className="text-muted">—</span>}</Td>
                <Td><Badge>{c._count.products}</Badge></Td>
                <Td><Badge>{c._count.children}</Badge></Td>
                <Td>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(c)}>Eliminar</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        topLevel={topLevel}
        onSaved={async () => {
          setModalOpen(false);
          await refresh();
        }}
      />
      {dialog}
    </div>
  );
}

function CategoryFormModal({
  open,
  onClose,
  editing,
  topLevel,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Category | null;
  topLevel: Category[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    values: editing
      ? { id: editing.id, name: editing.name, parentId: editing.parentId ?? "" }
      : { name: "", parentId: "" },
  });

  const onSubmit = async (data: CategoryInput) => {
    try {
      if (editing) {
        await updateCategory({ ...data, id: editing.id });
        toast.success("Categoría actualizada");
      } else {
        await createCategory(data);
        toast.success("Categoría creada");
      }
      reset();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar categoría" : "Nueva categoría"} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Nombre" required error={errors.name?.message} {...register("name")} />
        <Select label="Categoría padre (opcional)" {...register("parentId")}>
          <option value="">Ninguna (categoría principal)</option>
          {topLevel
            .filter((c) => c.id !== editing?.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
