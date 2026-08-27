import { z } from "zod";

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  email: z.string().min(1, "El correo es obligatorio").email("Correo inválido"),
  role: z.enum(["ADMIN", "VENDEDOR", "CAJERO"]),
  active: z.boolean().default(true),
  password: z.string().optional().or(z.literal("")),
});
export type UserInput = z.infer<typeof userSchema>;

export const resetPasswordAdminSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
});
