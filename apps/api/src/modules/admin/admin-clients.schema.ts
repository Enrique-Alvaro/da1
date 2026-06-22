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

export const listAdminClientsQuerySchema = z.object({
  admitido: z.enum(["si", "no", "all"]).optional().default("all"),
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListAdminClientsQuery = z.infer<typeof listAdminClientsQuerySchema>;
