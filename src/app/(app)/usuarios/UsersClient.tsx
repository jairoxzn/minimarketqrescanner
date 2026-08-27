"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { userSchema, type UserInput } from "@/lib/validations/user.schema";
import { createUser, listUsers, updateUser } from "@/actions/users.actions";
import { adminResetUserPassword } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

type User = Awaited<ReturnType<typeof listUsers>>[number];
type UserFormValues = z.input<typeof userSchema>;

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrador", VENDEDOR: "Vendedor", CAJERO: "Cajero" };

export function UsersClient({ initialUsers, currentUserId }: { initialUsers: User[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const toast = useToast();

  const refresh = async () => setUsers(await listUsers());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Usuarios</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>+ Nuevo usuario</Button>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Nombre</Th>
            <Th>Correo</Th>
            <Th>Rol</Th>
            <Th>Estado</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td className="font-medium">{u.name} {u.id === currentUserId && <span className="text-xs text-muted">(tú)</span>}</Td>
              <Td>{u.email}</Td>
              <Td><Badge>{ROLE_LABEL[u.role]}</Badge></Td>
              <Td><Badge tone={u.active ? "success" : "default"}>{u.active ? "Activo" : "Inactivo"}</Badge></Td>
              <Td>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="secondary" onClick={() => setResetTarget(u)}>Restablecer contraseña</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(u); setModalOpen(true); }}>Editar</Button>
                </div>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={async () => {
          setModalOpen(false);
          await refresh();
        }}
      />

      <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />
    </div>
  );
}

function UserFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: User | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues, unknown, UserInput>({
    resolver: zodResolver(userSchema),
    values: editing
      ? { id: editing.id, name: editing.name, email: editing.email, role: editing.role, active: editing.active, password: "" }
      : { name: "", email: "", role: "VENDEDOR", active: true, password: "" },
  });

  const onSubmit = async (data: UserInput) => {
    try {
      if (editing) {
        await updateUser({ ...data, id: editing.id });
        toast.success("Usuario actualizado");
      } else {
        await createUser(data);
        toast.success("Usuario creado");
      }
      reset();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar usuario" : "Nuevo usuario"}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Nombre" required error={errors.name?.message} {...register("name")} />
        <Input label="Correo electrónico" type="email" required error={errors.email?.message} {...register("email")} />
        <Select label="Rol" required error={errors.role?.message} {...register("role")}>
          <option value="ADMIN">Administrador</option>
          <option value="VENDEDOR">Vendedor</option>
          <option value="CAJERO">Cajero</option>
        </Select>
        {!editing && (
          <Input
            label="Contraseña"
            type="password"
            required
            hint="Mínimo 6 caracteres"
            error={errors.password?.message}
            {...register("password")}
          />
        )}
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("active")} />
          Usuario activo
        </label>
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await adminResetUserPassword(user.id, password);
      toast.success(`Contraseña de ${user.name} actualizada`);
      setPassword("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al restablecer la contraseña");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Restablecer contraseña — ${user?.name ?? ""}`} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Nueva contraseña"
          type="password"
          required
          hint="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Restablecer</Button>
        </div>
      </form>
    </Modal>
  );
}
