import { listAuditLogs, listAuditActionTypes } from "@/actions/audit.actions";
import { listUsers } from "@/actions/users.actions";
import { AuditoriaClient } from "./AuditoriaClient";

export default async function AuditoriaPage() {
  const [logs, actionTypes, users] = await Promise.all([listAuditLogs(), listAuditActionTypes(), listUsers()]);

  return (
    <AuditoriaClient
      initialLogs={logs}
      actionTypes={actionTypes}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
    />
  );
}
