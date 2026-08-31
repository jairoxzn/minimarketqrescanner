"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addCashMovement,
  closeCashRegister,
  getCurrentRegister,
  openCashRegister,
} from "@/actions/cash.actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";

type CurrentRegister = Awaited<ReturnType<typeof getCurrentRegister>>;

const MOVEMENT_LABEL: Record<string, string> = { INGRESO: "Ingreso", EGRESO: "Egreso", RETIRO: "Retiro" };
const MOVEMENT_TONE: Record<string, "success" | "danger" | "warning"> = {
  INGRESO: "success",
  EGRESO: "danger",
  RETIRO: "warning",
};

export function CajaClient({ initial }: { initial: CurrentRegister }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  const refresh = async () => setData(await getCurrentRegister());

  if (!data) {
    return <OpenRegisterCard onOpened={refresh} />;
  }

  const { register, summary } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex flex-wrap items-center justify-between gap-2">
        <span>
          🟢 Caja abierta por <strong>{register.openedBy.name}</strong> el{" "}
          <span suppressHydrationWarning>{formatDateTime(register.openedAt)}</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setMovementModalOpen(true)}>+ Ingreso / Egreso / Retiro</Button>
          <Button size="sm" variant="danger" onClick={() => setCloseModalOpen(true)}>Cerrar caja</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardBody><p className="text-sm text-muted">Monto inicial</p><p className="text-xl font-bold text-foreground">{formatMoney(summary.openingAmount)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Ventas en efectivo</p><p className="text-xl font-bold text-foreground">{formatMoney(summary.ventasEfectivo)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Ingresos</p><p className="text-xl font-bold text-emerald-700">{formatMoney(summary.ingresos)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Egresos + Retiros</p><p className="text-xl font-bold text-danger">{formatMoney(summary.egresos + summary.retiros)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-muted">Total esperado</p><p className="text-xl font-bold text-primary">{formatMoney(summary.expectedAmount)}</p></CardBody></Card>
      </div>

      <h2 className="text-sm font-semibold text-foreground">Movimientos de esta caja</h2>
      {register.movements.length === 0 ? (
        <EmptyState title="Sin movimientos registrados en esta caja todavía" icon="💰" />
      ) : (
        <Table>
          <Thead>
            <Tr><Th>Fecha</Th><Th>Tipo</Th><Th>Monto</Th><Th>Motivo</Th><Th>Usuario</Th></Tr>
          </Thead>
          <Tbody>
            {register.movements.map((m) => (
              <Tr key={m.id}>
                <Td className="whitespace-nowrap" suppressHydrationWarning>{formatDateTime(m.createdAt)}</Td>
                <Td><Badge tone={MOVEMENT_TONE[m.type]}>{MOVEMENT_LABEL[m.type]}</Badge></Td>
                <Td>{formatMoney(Number(m.amount))}</Td>
                <Td className="max-w-xs truncate">{m.reason}</Td>
                <Td>{m.user.name}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <MovementModal open={movementModalOpen} onClose={() => setMovementModalOpen(false)} onSaved={refresh} />
      <CloseRegisterModal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        expectedAmount={summary.expectedAmount}
        onClosed={() => {
          setCloseModalOpen(false);
          router.push("/caja/historial");
        }}
      />
    </div>
  );
}

function OpenRegisterCard({ onOpened }: { onOpened: () => void }) {
  const [openingAmount, setOpeningAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await openCashRegister({ openingAmount: Number(openingAmount) || 0 });
      toast.success("Caja abierta correctamente");
      onOpened();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al abrir la caja");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-sm">
      <CardBody>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted">No hay ninguna caja abierta. Registra el monto inicial para comenzar el turno.</p>
          <Input
            label="Monto inicial (S/)"
            type="number"
            min="0"
            step="0.01"
            required
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
          />
          <Button type="submit" isLoading={isSubmitting}>💰 Abrir caja</Button>
        </form>
      </CardBody>
    </Card>
  );
}

function MovementModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"INGRESO" | "EGRESO" | "RETIRO">("INGRESO");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addCashMovement({ type, amount: Number(amount), reason });
      toast.success("Movimiento registrado");
      setAmount("");
      setReason("");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar movimiento de caja" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="INGRESO">Ingreso</option>
          <option value="EGRESO">Egreso</option>
          <option value="RETIRO">Retiro</option>
        </Select>
        <Input label="Monto (S/)" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Textarea label="Motivo" required value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}

function CloseRegisterModal({
  open,
  onClose,
  expectedAmount,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  expectedAmount: number;
  onClosed: () => void;
}) {
  const [countedAmount, setCountedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const counted = Number(countedAmount) || 0;
  const difference = countedAmount ? counted - expectedAmount : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await closeCashRegister({ countedAmount: counted, notes });
      toast.success("Caja cerrada correctamente");
      onClosed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cerrar la caja");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cerrar caja" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Total esperado</span>
          <span className="font-semibold text-foreground">{formatMoney(expectedAmount)}</span>
        </div>
        <Input
          label="Dinero contado (S/)"
          type="number"
          min="0"
          step="0.01"
          required
          value={countedAmount}
          onChange={(e) => setCountedAmount(e.target.value)}
        />
        {difference !== null && (
          <div className={`flex justify-between text-sm font-medium ${difference === 0 ? "text-emerald-700" : difference > 0 ? "text-primary" : "text-danger"}`}>
            <span>Diferencia</span>
            <span>{difference > 0 ? "+" : ""}{formatMoney(difference)}</span>
          </div>
        )}
        <Textarea label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="danger" isLoading={isSubmitting}>Confirmar cierre</Button>
        </div>
      </form>
    </Modal>
  );
}
