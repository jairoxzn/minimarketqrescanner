import { z } from "zod";

export const customerSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "El nombre es obligatorio").max(200),
    docType: z.enum(["DNI", "RUC", "CE", "PASSPORT", "NONE"]).default("NONE"),
    docNumber: z.string().max(20).optional().or(z.literal("")),
    phone: z.string().max(20).optional().or(z.literal("")),
    address: z.string().max(255).optional().or(z.literal("")),
    email: z.string().email("Correo inválido").optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.docType === "DNI" && data.docNumber) return /^\d{8}$/.test(data.docNumber);
      return true;
    },
    { message: "El DNI debe tener 8 dígitos", path: ["docNumber"] }
  )
  .refine(
    (data) => {
      if (data.docType === "RUC" && data.docNumber) return /^\d{11}$/.test(data.docNumber);
      return true;
    },
    { message: "El RUC debe tener 11 dígitos", path: ["docNumber"] }
  );
export type CustomerInput = z.infer<typeof customerSchema>;
