import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const PAYMENT_METHOD_TYPES = [
  "cuenta_bancaria",
  "cuenta_bancaria_extranjera",
  "tarjeta_credito",
  "tarjeta_credito_extranjera",
  "cheque_certificado",
] as const;

export const PAYMENT_METHOD_CURRENCIES = ["ARS", "USD"] as const;

const CARD_TYPES = ["tarjeta_credito", "tarjeta_credito_extranjera"] as const;
const BANK_TYPES = ["cuenta_bancaria", "cuenta_bancaria_extranjera"] as const;

const FORBIDDEN_BODY_KEYS = [
  "estado",
  "verificador",
  "cliente",
  "clienteId",
  "motivoRechazo",
  "verificadoEn",
  "cvv",
  "cvc",
  "cardNumber",
  "numeroTarjeta",
  "pan",
  "fullCardNumber",
  "numeroTarjetaCompleto",
] as const;

const CVV_KEYS = new Set(["cvv", "cvc"]);

const FULL_CARD_KEYS = new Set([
  "cardNumber",
  "numeroTarjeta",
  "pan",
  "fullCardNumber",
  "numeroTarjetaCompleto",
]);

export function assertNoForbiddenPaymentBodyKeys(body: unknown): void {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return;
  }
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BODY_KEYS.includes(key as (typeof FORBIDDEN_BODY_KEYS)[number])) {
      if (CVV_KEYS.has(key)) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "No se permite enviar CVV.",
            path: [key],
          },
        ]);
      }
      if (FULL_CARD_KEYS.has(key)) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "No se permite enviar el número de tarjeta completo.",
            path: [key],
          },
        ]);
      }
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: `El campo ${key} no puede enviarse en el alta del medio de pago.`,
          path: [key],
        },
      ]);
    }
  }
}

const baseBodySchema = z
  .object({
    tipo: z.enum(PAYMENT_METHOD_TYPES, {
      errorMap: () => ({ message: "tipo de medio de pago inválido" }),
    }),
    moneda: z.enum(PAYMENT_METHOD_CURRENCIES, {
      errorMap: () => ({ message: "moneda inválida (ARS o USD)" }),
    }),
    titular: z.string().trim().min(1, "titular es obligatorio").max(150),
    entidad: z.string().trim().max(150).optional().nullable(),
    ultimosDigitos: z.string().trim().optional().nullable(),
    aliasOCbu: z.string().trim().max(50).optional().nullable(),
    montoGarantia: z.coerce.number().optional().nullable(),
  })
  .strict();

export const createPaymentMethodBodySchema = baseBodySchema.superRefine((data, ctx) => {
  const tipo = data.tipo;

  if (CARD_TYPES.includes(tipo as (typeof CARD_TYPES)[number])) {
    if (!data.entidad?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entidad es obligatoria para tarjetas",
        path: ["entidad"],
      });
    }
    if (!data.ultimosDigitos?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ultimosDigitos es obligatorio para tarjetas",
        path: ["ultimosDigitos"],
      });
    } else if (!/^\d{4}$/.test(data.ultimosDigitos.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ultimosDigitos debe ser exactamente 4 dígitos numéricos",
        path: ["ultimosDigitos"],
      });
    }
    return;
  }

  if (BANK_TYPES.includes(tipo as (typeof BANK_TYPES)[number])) {
    if (!data.entidad?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entidad es obligatoria para cuentas bancarias",
        path: ["entidad"],
      });
    }
    if (!data.aliasOCbu?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "aliasOCbu es obligatorio para cuentas bancarias",
        path: ["aliasOCbu"],
      });
    }
    return;
  }

  if (tipo === "cheque_certificado") {
    if (!data.entidad?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entidad es obligatoria para cheque certificado",
        path: ["entidad"],
      });
    }
    const amount = data.montoGarantia;
    if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "montoGarantia es obligatorio y debe ser mayor a 0",
        path: ["montoGarantia"],
      });
    }
  }
});

export type CreatePaymentMethodBody = z.infer<typeof createPaymentMethodBodySchema>;

export const paymentMethodIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
