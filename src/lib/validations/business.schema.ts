import { z } from "zod";

export const businessSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  legalName: z.string().max(200).optional().or(z.literal("")),
  ruc: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  logoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  currencySymbol: z.string().min(1).max(5).default("S/"),
  igvEnabled: z.boolean().default(true),
  igvPercent: z.coerce.number().min(0).max(100).default(18),
  igvIncluded: z.boolean().default(true),
  ticketSeries: z.string().min(1, "La serie es obligatoria").max(10),
  allowNegativeStock: z.boolean().default(false),
  resetTicketCounter: z.boolean().default(false),
});
export type BusinessInput = z.infer<typeof businessSchema>;
