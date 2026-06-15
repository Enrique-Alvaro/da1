import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const notificationIdParamsSchema = z.object({
  notificationId: z.coerce.number().int().positive(),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join("; ");
}
