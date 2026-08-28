import { z } from "zod";

export const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  ruc: z.string().max(20).optional().or(z.literal("")),
  contactName: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  active: z.boolean().default(true),
});
export type SupplierInput = z.infer<typeof supplierSchema>;
