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

export const MAX_BID_AMOUNT = 999_999_999_999.99;

export const createBidBodySchema = z
  .object({
    itemId: z.coerce.number().int().positive("itemId debe ser un entero positivo"),
    amount: z.coerce
      .number({ invalid_type_error: "amount debe ser numérico" })
      .finite("amount inválido")
      .positive("amount debe ser mayor a 0")
      .max(MAX_BID_AMOUNT, "amount supera el límite permitido")
      .refine(
        (n) => Math.round(n * 100) === n * 100,
        "amount admite como máximo 2 decimales"
      ),
    paymentMethodId: z.coerce
      .number()
      .int()
      .positive("paymentMethodId es obligatorio"),
  })
  .strict();

export type CreateBidBody = z.infer<typeof createBidBodySchema>;
