import { z } from "zod";

export const openCashRegisterSchema = z.object({
  openingAmount: z.coerce.number().min(0, "El monto inicial no puede ser negativo"),
});
export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;

export const cashMovementSchema = z.object({
  type: z.enum(["INGRESO", "EGRESO", "RETIRO"]),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  reason: z.string().min(1, "El motivo es obligatorio").max(255),
});
export type CashMovementInput = z.infer<typeof cashMovementSchema>;

export const closeCashRegisterSchema = z.object({
  countedAmount: z.coerce.number().min(0, "El monto contado no puede ser negativo"),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
