/**
 * Convierte un código de acción tipo "SALE_CREATE" en "Sale create" para
 * mostrarlo en la UI. Deliberadamente genérico (no un mapa a mano por acción)
 * — un mapa fijo se queda desactualizado en cuanto se agrega una acción nueva
 * y renderiza vacío en vez de algo legible (ver el bug de DEVOLUCION en
 * /inventario/movimientos, corregido en el commit de Devoluciones).
 */
export function humanizeAuditAction(action: string) {
  const words = action.toLowerCase().split("_");
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

const ENTITY_LABEL: Record<string, string> = {
  Sale: "Venta",
  Product: "Producto",
  Category: "Categoría",
  Brand: "Marca",
  Customer: "Cliente",
  User: "Usuario",
  Business: "Negocio",
  PaymentMethod: "Método de pago",
  CashRegister: "Caja",
  CashMovement: "Movimiento de caja",
  Return: "Devolución",
};

export function humanizeEntityType(entityType: string) {
  return ENTITY_LABEL[entityType] ?? entityType;
}
