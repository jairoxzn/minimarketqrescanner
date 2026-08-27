import { z } from "zod";

export const saleItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1"),
  discount: z.coerce.number().min(0).default(0),
});
export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const salePaymentInputSchema = z.object({
  paymentMethodId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  reference: z.string().max(100).optional(),
});
export type SalePaymentInput = z.infer<typeof salePaymentInputSchema>;

export const createSaleSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  items: z.array(saleItemInputSchema).min(1, "El carrito está vacío"),
  discount: z.coerce.number().min(0).default(0),
  payments: z.array(salePaymentInputSchema).min(1, "Selecciona un método de pago"),
  amountReceived: z.coerce.number().min(0).optional(),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
