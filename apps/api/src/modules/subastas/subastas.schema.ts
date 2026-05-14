import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const subastasIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
