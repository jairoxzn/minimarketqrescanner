import type { Role } from "@prisma/client";
import type { Session } from "next-auth";

/**
 * Server-side authorization matrix. This is the real security boundary —
 * middleware.ts only gates routes coarsely for UX. Every Server Action must
 * call can()/requirePermission() itself and never trust a role/businessId
 * sent from the client.
 *
 * CAJERO now differs from VENDEDOR by the cash.* permissions (PRD §20: Cajero
 * puede abrir/cerrar caja y registrar ingresos/egresos; Vendedor no aparece
 * en esa lista) — previously identical, this was a placeholder until the Caja
 * module existed.
 */
const SELLING_PERMISSIONS = [
  "products.view",
  "categories.view",
  "brands.view",
  "customers.view",
  "customers.create",
  "customers.update",
  "paymentMethods.view",
  "pos.sell",
  "sales.viewOwn",
  "sales.print",
  "inventory.view",
  "dashboard.view",
  "returns.create",
  "returns.view",
] as const;

export const ROLE_PERMISSIONS: Record<Role, Set<string> | "*"> = {
  ADMIN: "*",
  VENDEDOR: new Set(SELLING_PERMISSIONS),
  CAJERO: new Set([...SELLING_PERMISSIONS, "cash.open", "cash.close", "cash.movement", "cash.view"]),
};

export function can(session: Session | null | undefined, permission: string): boolean {
  if (!session?.user) return false;
  const perms = ROLE_PERMISSIONS[session.user.role];
  if (perms === "*") return true;
  return perms.has(permission);
}

export class UnauthorizedError extends Error {
  constructor(message = "No autorizado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Throws if the session is missing or lacks the given permission. Returns the session for chaining. */
export function requirePermission(session: Session | null | undefined, permission: string): Session {
  if (!session?.user) {
    throw new UnauthorizedError("No autenticado");
  }
  if (!can(session, permission)) {
    throw new UnauthorizedError("No autorizado para esta acción");
  }
  return session;
}
