import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const subastaItemParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
});

export const closeItemBodySchema = z
  .object({
    paymentMethodId: z.coerce.number().int().positive().optional(),
  })
  .optional()
  .default({});

export type CloseItemBody = z.infer<typeof closeItemBodySchema>;
