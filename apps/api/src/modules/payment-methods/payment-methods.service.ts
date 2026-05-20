import { z } from "zod";
import type { AuthUserContext } from "../../shared/types/auth";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../shared/errors/httpErrors";
import * as usersRepository from "../users/users.repository";
import { mapMedioPagoToPublic, type PaymentMethodPublic } from "./payment-methods.mapper";
import * as paymentMethodsRepository from "./payment-methods.repository";
import {
  assertNoForbiddenPaymentBodyKeys,
  createPaymentMethodBodySchema,
  formatZodError,
  type CreatePaymentMethodBody,
} from "./payment-methods.schema";

/**
 * JWT `sub` = personas.identificador = clientes.identificador.
 * Registro siempre crea fila en clientes; no exigimos admitido='si' para alta de medios (puja se bloquea en Fase 4).
 */
export async function resolveClienteId(authUser: AuthUserContext): Promise<number> {
  const raw = authUser.id?.trim() ?? "";
  if (!/^\d+$/.test(raw)) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  const personaId = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(personaId) || personaId <= 0) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }

  const profile = await usersRepository.findProfileByPersonId(personaId);
  if (!profile) {
    throw new ForbiddenError(
      "No se encontró un cliente asociado a este usuario.",
      "CLIENT_NOT_FOUND"
    );
  }

  return personaId;
}

function mapZodToHttpError(error: z.ZodError): never {
  const issue = error.issues[0];
  const pathKey = String(issue?.path[0] ?? "");
  const message = issue?.message ?? formatZodError(error);

  if (pathKey === "cvv" || pathKey === "cvc") {
    throw new BadRequestError("No se permite enviar CVV.", "PAYMENT_METHOD_FIELD_REQUIRED");
  }
  if (
    pathKey === "cardNumber" ||
    pathKey === "numeroTarjeta" ||
    pathKey === "pan" ||
    pathKey === "fullCardNumber" ||
    pathKey === "numeroTarjetaCompleto"
  ) {
    throw new BadRequestError(
      "No se permite enviar el número de tarjeta completo.",
      "FULL_CARD_NUMBER_NOT_ALLOWED"
    );
  }
  if (pathKey === "tipo") {
    throw new BadRequestError(message, "PAYMENT_METHOD_TYPE_INVALID");
  }
  if (pathKey === "moneda") {
    throw new BadRequestError(message, "PAYMENT_METHOD_CURRENCY_INVALID");
  }
  if (pathKey === "ultimosDigitos") {
    throw new BadRequestError(message, "PAYMENT_METHOD_INVALID_LAST_DIGITS");
  }
  if (pathKey === "montoGarantia") {
    throw new BadRequestError(message, "PAYMENT_METHOD_INVALID_AMOUNT");
  }
  if (
    pathKey === "titular" ||
    pathKey === "entidad" ||
    pathKey === "aliasOCbu"
  ) {
    throw new BadRequestError(message, "PAYMENT_METHOD_FIELD_REQUIRED");
  }
  if (
    pathKey === "estado" ||
    pathKey === "verificador" ||
    pathKey === "cliente" ||
    pathKey === "clienteId" ||
    pathKey === "motivoRechazo" ||
    pathKey === "verificadoEn"
  ) {
    throw new BadRequestError(message, "PAYMENT_METHOD_FIELD_REQUIRED");
  }

  throw new ValidationError(formatZodError(error));
}

export async function listMyPaymentMethods(
  authUser: AuthUserContext
): Promise<{ items: PaymentMethodPublic[] }> {
  const clienteId = await resolveClienteId(authUser);
  const rows = await paymentMethodsRepository.listByCliente(clienteId);
  return { items: rows.map(mapMedioPagoToPublic) };
}

export async function createPaymentMethod(
  authUser: AuthUserContext,
  body: unknown
): Promise<{
  id: number;
  type: string;
  status: string;
  message: string;
}> {
  try {
    assertNoForbiddenPaymentBodyKeys(body);
  } catch (e) {
    if (e instanceof z.ZodError) {
      mapZodToHttpError(e);
    }
    throw e;
  }

  const parsed = createPaymentMethodBodySchema.safeParse(body);
  if (!parsed.success) {
    mapZodToHttpError(parsed.error);
  }

  const clienteId = await resolveClienteId(authUser);
  const row = await paymentMethodsRepository.insertMedioPago({
    clienteId,
    body: parsed.data as CreatePaymentMethodBody,
  });
  const pub = mapMedioPagoToPublic(row);

  return {
    id: pub.id,
    type: pub.type,
    status: pub.status,
    message:
      "Medio de pago registrado. La empresa debe verificarlo antes de que puedas pujar.",
  };
}

export async function disablePaymentMethod(
  authUser: AuthUserContext,
  paymentMethodId: number
): Promise<{ id: number; status: string }> {
  const clienteId = await resolveClienteId(authUser);
  const row = await paymentMethodsRepository.disableMedioPago(paymentMethodId, clienteId);
  if (!row) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }
  return { id: row.identificador, status: row.estado };
}
