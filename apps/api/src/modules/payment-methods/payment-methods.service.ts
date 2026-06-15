import { z } from "zod";
import type { AuthUserContext } from "../../shared/types/auth";
import {
  BadRequestError,
  ConflictError,
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
  updateGuaranteeBodySchema,
} from "./payment-methods.schema";

/**
 * JWT `sub` = personas.identificador = clientes.identificador.
 * Valida fila en dbo.clientes vía findClienteByPersonId (no exige admitido='si' en Fase 2).
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

  const cliente = await usersRepository.findClienteByPersonId(personaId);
  if (!cliente) {
    throw new ForbiddenError(
      "No se encontró un cliente asociado a este usuario.",
      "CLIENT_NOT_FOUND"
    );
  }

  return cliente.identificador;
}

function mapZodToHttpError(error: z.ZodError): never {
  const issue = error.issues[0];
  const pathKey = String(issue?.path[0] ?? "");
  const message = issue?.message ?? formatZodError(error);

  if (pathKey === "cvv" || pathKey === "cvc") {
    throw new BadRequestError("No se permite enviar CVV.", "CVV_NOT_ALLOWED");
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

export async function updatePaymentMethodGuarantee(
  authUser: AuthUserContext,
  paymentMethodId: number,
  body: unknown
): Promise<{ item: PaymentMethodPublic; message: string }> {
  const parsed = updateGuaranteeBodySchema.safeParse(body);
  if (!parsed.success) {
    mapZodToHttpError(parsed.error);
  }

  const clienteId = await resolveClienteId(authUser);
  const existing = await paymentMethodsRepository.findByIdAndCliente(paymentMethodId, clienteId);
  if (!existing) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }
  if (existing.tipo === "cheque_certificado") {
    throw new BadRequestError(
      "El monto del cheque certificado se define al registrarlo.",
      "CHEQUE_GUARANTEE_IMMUTABLE"
    );
  }
  if (existing.estado === "deshabilitado" || existing.estado === "rechazado") {
    throw new ConflictError(
      "No se puede reservar fondos en un medio deshabilitado o rechazado.",
      "PAYMENT_METHOD_NOT_ACTIVE"
    );
  }

  const row = await paymentMethodsRepository.updateGuaranteeAmount(
    paymentMethodId,
    clienteId,
    parsed.data.montoGarantia
  );
  if (!row) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }

  return {
    item: mapMedioPagoToPublic(row),
    message: "Monto de garantía actualizado. La empresa verificará el medio antes de pujar.",
  };
}
