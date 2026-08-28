import { z } from "zod";

export const paymentMethodSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(50),
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guiones bajos"),
  // Data URL (base64) de la imagen del QR — ver nota en el schema de Prisma.
  qrImageUrl: z.string().max(2_000_000, "La imagen es demasiado grande").optional().or(z.literal("")),
});
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
