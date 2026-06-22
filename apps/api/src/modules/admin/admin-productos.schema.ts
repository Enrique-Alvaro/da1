import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const adminProductIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateDepositoBodySchema = z.object({
  depositoUbicacion: z.string().trim().min(1, "depositoUbicacion es obligatorio").max(250),
});

export const updateSeguroBodySchema = z.object({
  seguro: z.string().trim().min(1, "seguro es obligatorio").max(30),
  compania: z.string().trim().min(1, "compania es obligatoria").max(150),
  descripcion: z.string().trim().max(500).optional(),
  vigenciaDesde: z.string().trim().max(30).optional(),
  vigenciaHasta: z.string().trim().max(30).optional(),
  importe: z.coerce.number().positive().optional(),
  polizaCombinada: z.enum(["si", "no"]).optional(),
});

export type UpdateDepositoBody = z.infer<typeof updateDepositoBodySchema>;
export type UpdateSeguroBody = z.infer<typeof updateSeguroBodySchema>;
