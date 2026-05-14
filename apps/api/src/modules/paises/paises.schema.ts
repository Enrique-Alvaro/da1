import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const paisesIdParamSchema = z.object({
  id: z.coerce.number().int().positive("El identificador del país debe ser un entero positivo"),
});

export const paisesCreateBodySchema = z.object({
  numero: z.coerce.number().int().positive("numero debe ser un entero positivo"),
  nombre: z.string().trim().min(1, "nombre es obligatorio").max(250),
  nombreCorto: z.union([z.string().trim().max(250), z.null()]).optional(),
  capital: z.string().trim().min(1, "capital es obligatoria").max(250),
  nacionalidad: z.string().trim().min(1, "nacionalidad es obligatoria").max(250),
  idiomas: z.string().trim().min(1, "idiomas es obligatorio").max(150),
});

export const paisesUpdateBodySchema = z.object({
  nombre: z.string().trim().min(1, "nombre es obligatorio").max(250),
  nombreCorto: z.union([z.string().trim().max(250), z.null()]).optional(),
  capital: z.string().trim().min(1, "capital es obligatoria").max(250),
  nacionalidad: z.string().trim().min(1, "nacionalidad es obligatoria").max(250),
  idiomas: z.string().trim().min(1, "idiomas es obligatorio").max(150),
});

export type PaisesCreateBody = z.infer<typeof paisesCreateBodySchema>;
export type PaisesUpdateBody = z.infer<typeof paisesUpdateBodySchema>;
