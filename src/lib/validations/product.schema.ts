import { z } from "zod";

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  sku: z.string().max(50).optional().or(z.literal("")),
  barcode: z.string().max(50).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  brandId: z.string().optional().or(z.literal("")),
  // Data URL (imagen subida y comprimida en el cliente) o una URL externa pegada a mano.
  imageUrl: z.string().max(2_000_000, "La imagen es demasiado grande").optional().or(z.literal("")),
  purchasePrice: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  salePrice: z.coerce.number().min(0.01, "Debe ser mayor a 0"),
  minStock: z.coerce.number().int().min(0).default(0),
  unit: z.string().min(1).max(30).default("unidad"),
  active: z.boolean().default(true),
  // Solo aplica al crear — el stock luego se ajusta desde Inventario para mantener el historial de movimientos.
  initialStock: z.coerce.number().int().min(0).default(0).optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const productImportRowSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0.01),
  stock: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  unit: z.string().optional(),
});
export type ProductImportRow = z.infer<typeof productImportRowSchema>;
