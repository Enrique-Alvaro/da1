import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const myStatusQuerySchema = z.object({
  auctionId: z.coerce.number().int().positive().optional(),
});
