"use client";

import { useState, useTransition } from "react";
import { listAuditLogs, type AuditLogFilters } from "@/actions/audit.actions";
import { Input, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/date";
import { humanizeAuditAction, humanizeEntityType } from "@/lib/audit-format";

type AuditLog = Awaited<ReturnType<typeof listAuditLogs>>[number];

export function AuditoriaClient({
  initialLogs,
  actionTypes,
  users,
}: {
  initialLogs: AuditLog[];
  actionTypes: string[];
  users: { id: string; name: string }[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [isPending, startTransition] = useTransition();

  const applyFilters = (next: AuditLogFilters) => {
    setFilters(next);
    startTransition(async () => setLogs(await listAuditLogs(next)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Auditoría</h1>
        <p className="text-sm text-muted mt-1">Registro de acciones importantes realizadas en el sistema — quién, qué y cuándo.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-border">
        <Select value={filters.userId ?? ""} onChange={(e) => applyFilters({ ...filters, userId: e.target.value || undefined })}>
          <option value="">Todos los usuarios</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <Select value={filters.action ?? ""} onChange={(e) => applyFilters({ ...filters, action: e.target.value || undefined })}>
          <option value="">Todas las acciones</option>
          {actionTypes.map((a) => <option key={a} value={a}>{humanizeAuditAction(a)}</option>)}
        </Select>
        <Input type="date" placeholder="Desde" onChange={(e) => applyFilters({ ...filters, dateFrom: e.target.value || undefined })} />
        <Input type="date" placeholder="Hasta" onChange={(e) => applyFilters({ ...filters, dateTo: e.target.value || undefined })} />
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Sin registros de auditoría" icon="🕵️" />
      ) : (
        <Table className={isPending ? "opacity-60" : ""}>
          <Thead>
            <Tr>
              <Th>Fecha</Th>
              <Th>Usuario</Th>
              <Th>Acción</Th>
              <Th>Entidad</Th>
              <Th>Detalle</Th>
            </Tr>
          </Thead>
          <Tbody>
            {logs.map((log) => (
              <Tr key={log.id}>
                <Td className="whitespace-nowrap" suppressHydrationWarning>{formatDateTime(log.createdAt)}</Td>
                <Td>{log.user?.name ?? <span className="text-muted">Sistema</span>}</Td>
                <Td><Badge tone="info">{humanizeAuditAction(log.action)}</Badge></Td>
                <Td>{humanizeEntityType(log.entityType)}{log.entityId && <span className="text-muted text-xs"> · {log.entityId.slice(0, 10)}…</span>}</Td>
                <Td className="max-w-xs truncate text-xs text-muted" title={log.metadata ? JSON.stringify(log.metadata) : undefined}>
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
