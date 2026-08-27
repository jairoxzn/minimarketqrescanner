import { z } from "zod";

export const paymentMethodSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(50),
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guiones bajos"),
});
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
