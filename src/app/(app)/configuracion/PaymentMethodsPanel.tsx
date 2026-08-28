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
            <Th>QR</Th>
            <Th>Estado</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {methods.map((m) => (
            <Tr key={m.id}>
              <Td className="font-medium">{m.name}</Td>
              <Td className="text-muted">{m.code}</Td>
              <Td>
                {m.qrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.qrImageUrl} alt={`QR de ${m.name}`} className="h-10 w-10 rounded border border-border object-contain" />
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Td>
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
        key={editing?.id ?? "new"}
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
  const [qrImageUrl, setQrImageUrl] = useState(editing?.qrImageUrl ?? "");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodInput>({
    resolver: zodResolver(paymentMethodSchema),
    values: editing ? { id: editing.id, name: editing.name, code: editing.code } : { name: "", code: "" },
  });

  const MAX_QR_FILE_BYTES = 800_000; // ~800KB — de sobra para un QR, evita blobs enormes en la base de datos.

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo si el usuario lo intenta de nuevo
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > MAX_QR_FILE_BYTES) {
      toast.error("La imagen es muy grande (máx. 800 KB)");
      return;
    }
    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      setQrImageUrl(String(reader.result));
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      toast.error("No se pudo leer la imagen");
      setIsReadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: PaymentMethodInput) => {
    try {
      const payload = { ...data, qrImageUrl };
      if (editing) {
        await updatePaymentMethod({ ...payload, id: editing.id });
        toast.success("Actualizado");
      } else {
        await createPaymentMethod(payload);
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Código QR (opcional) <span className="text-muted font-normal">— ej. tu QR de Yape o Plin</span>
          </label>
          {qrImageUrl && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="QR" className="h-24 w-24 rounded border border-border object-contain bg-white" />
              <Button type="button" variant="secondary" size="sm" onClick={() => setQrImageUrl("")}>Quitar</Button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          {isReadingFile && <p className="text-xs text-muted">Cargando imagen…</p>}
          {errors.qrImageUrl?.message && <p className="text-xs text-danger">{errors.qrImageUrl.message}</p>}
          <p className="text-xs text-muted">
            Se mostrará en el punto de venta cuando el cajero elija este método de pago, para que el cliente lo escanee.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
