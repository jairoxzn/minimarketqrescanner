import { z } from "zod";

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1"),
  unitCost: z.coerce.number().min(0, "El costo no puede ser negativo"),
});
export type PurchaseItemInput = z.infer<typeof purchaseItemInputSchema>;

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, "Selecciona un proveedor"),
  invoiceNumber: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z.array(purchaseItemInputSchema).min(1, "Agrega al menos un producto"),
  receiveNow: z.boolean().default(false),
});
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
