import { z } from "zod";

export const brandSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(100),
});
export type BrandInput = z.infer<typeof brandSchema>;
