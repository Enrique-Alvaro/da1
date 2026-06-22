import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const subastasIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listSubastasQuerySchema = z.object({
  featured: z.enum(["true", "false"]).optional(),
  status: z.enum(["scheduled", "live", "closed"]).optional(),
  category: z
    .enum(["comun", "especial", "plata", "oro", "platino"])
    .optional(),
});

export const liveStateQuerySchema = z.object({
  watchedItemId: z.coerce.number().int().positive().optional(),
});
