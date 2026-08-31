/**
 * Clasificación de stock compartida — "agotado" (stock <= 0) y "stock bajo"
 * (stock > 0 pero <= el mínimo configurado del producto). Este mismo par de
 * filtros se repetía copiado en el dashboard, el listado de productos, el
 * reporte de productos y el resumen de inventario; centralizado acá para que
 * un cambio futuro al criterio (ej. un margen de tolerancia) no dependa de
 * actualizar cada copia por separado.
 */
export interface StockLevels<T> {
  outOfStock: T[];
  lowStock: T[];
}

export function classifyStock<T extends { stock: number; minStock: number }>(products: T[]): StockLevels<T> {
  return {
    outOfStock: products.filter((p) => p.stock <= 0),
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= p.minStock),
  };
}
