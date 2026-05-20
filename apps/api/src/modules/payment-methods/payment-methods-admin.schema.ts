import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

export const PAYMENT_METHOD_STATUSES = [
  "pendiente",
  "verificado",
  "rechazado",
  "deshabilitado",
] as const;

/** Valores persistidos en dbo.mediosPago.estado. */
export type PaymentMethodStatus = (typeof PAYMENT_METHOD_STATUSES)[number];

/** Filtro de listado admin; "all" no es un estado de BD. */
export type PaymentMethodStatusFilter = PaymentMethodStatus | "all";

const STATUS_FILTER_VALUES = [...PAYMENT_METHOD_STATUSES, "all"] as const;

export const adminPaymentMethodListQuerySchema = z.object({
  status: z
    .enum(STATUS_FILTER_VALUES)
    .optional()
    .default("pendiente"),
});

export type AdminPaymentMethodListQuery = z.infer<typeof adminPaymentMethodListQuerySchema>;

export const paymentMethodIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const rejectPaymentMethodBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "reason es obligatorio")
    .max(500, "reason no puede superar 500 caracteres"),
});

export type RejectPaymentMethodBody = z.infer<typeof rejectPaymentMethodBodySchema>;
