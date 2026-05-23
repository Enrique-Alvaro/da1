import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

const CATEGORY_VALUES = ["comun", "especial", "plata", "oro", "platino"] as const;

export const clientIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const admitClienteBodySchema = z.object({
  admitido: z.enum(["si", "no"], {
    errorMap: () => ({ message: "admitido debe ser 'si' o 'no'" }),
  }),
  categoria: z.enum(CATEGORY_VALUES).optional(),
});

export type AdmitClienteBody = z.infer<typeof admitClienteBodySchema>;
