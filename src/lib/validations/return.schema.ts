import { z } from "zod";

export const returnItemInputSchema = z.object({
  saleItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1"),
});
export type ReturnItemInput = z.infer<typeof returnItemInputSchema>;

export const createReturnSchema = z.object({
  saleId: z.string().min(1),
  reason: z.string().min(1, "El motivo es obligatorio").max(500),
  items: z.array(returnItemInputSchema).min(1, "Selecciona al menos un producto a devolver"),
});
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
