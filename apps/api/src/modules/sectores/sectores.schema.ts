import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const sectoresIdParamSchema = z.object({
  id: z.coerce.number().int().positive("El identificador del sector debe ser un entero positivo"),
});

export const sectoresCreateBodySchema = z.object({
  nombreSector: z.string().trim().min(1, "nombreSector es obligatorio").max(150),
  codigoSector: z.union([z.string().trim().max(10), z.null()]).optional(),
  responsableSector: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
});

export const sectoresUpdateBodySchema = z.object({
  nombreSector: z.string().trim().min(1, "nombreSector es obligatorio").max(150),
  codigoSector: z.union([z.string().trim().max(10), z.null()]).optional(),
  responsableSector: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
});

export type SectoresCreateBody = z.infer<typeof sectoresCreateBodySchema>;
export type SectoresUpdateBody = z.infer<typeof sectoresUpdateBodySchema>;
