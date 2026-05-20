import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";
import { subastasIdParamSchema } from "../subastas/subastas.schema";

export { formatZodError, subastasIdParamSchema };

const FORBIDDEN_BID_BODY_KEYS = [
  "cliente",
  "clienteId",
  "asistente",
  "asistenteId",
  "estado",
  "ganador",
  "verificador",
] as const;

export function assertNoForbiddenBidBodyKeys(body: unknown): void {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return;
  }
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BID_BODY_KEYS.includes(key as (typeof FORBIDDEN_BID_BODY_KEYS)[number])) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: `El campo ${key} no puede enviarse en la puja.`,
          path: [key],
        },
      ]);
    }
  }
}

export const createBidBodySchema = z
  .object({
    itemId: z.coerce.number().int().positive("itemId debe ser un entero positivo"),
    amount: z.coerce
      .number()
      .positive("amount debe ser mayor a 0")
      .refine((n) => Number.isFinite(n), "amount inválido"),
    paymentMethodId: z.coerce
      .number()
      .int()
      .positive("paymentMethodId es obligatorio"),
  })
  .strict();

export type CreateBidBody = z.infer<typeof createBidBodySchema>;
