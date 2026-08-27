import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  parentId: z.string().optional().nullable(),
});
export type CategoryInput = z.infer<typeof categorySchema>;
