import { Prisma } from "@prisma/client";

/**
 * Recursively converts every Prisma `Decimal` instance in `value` to a plain
 * `number`. Next.js refuses to pass class instances (Decimal included) from a
 * Server Component/Server Action to a Client Component — "Only plain objects
 * can be passed..." — so any query result that touches a `Client Component
 * prop or a Server Action's return value must go through this first.
 *
 * Deliberately generic (walks the whole object/array tree) rather than a
 * hand-picked list of "these fields are Decimal" per model — a hand-picked
 * list is exactly the kind of thing that quietly goes stale (see the
 * DEVOLUCION movement-type label bug) the moment a model gains a new Decimal
 * field or a query adds a new `include`.
 */
export function serializeDecimals<T>(value: T): T {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber() as unknown as T;
  }
  if (value instanceof Date || value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimals(item)) as unknown as T;
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializeDecimals(val);
    }
    return result as T;
  }
  return value;
}
