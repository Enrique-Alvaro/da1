import {
  notifyPaymentMethodRejected,
  notifyPaymentMethodVerified,
} from "../notifications/notifications.events";
import type { AuthUserContext } from "../../shared/types/auth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/httpErrors";
import { findEmpleadoById } from "../empleados/empleados.repository";
import {
  mapAdminListRow,
  mapRejectResponse,
  mapVerifyResponse,
} from "./payment-methods-admin.mapper";
import * as adminRepository from "./payment-methods-admin.repository";
import type { MedioPagoRow } from "./payment-methods.repository";
import type {
  AdminPaymentMethodListQuery,
  RejectPaymentMethodBody,
} from "./payment-methods-admin.schema";

/**
 * Verificador = empleado del JWT (requireEmployeeAuth: role empleado + employeeId en claims).
 * Login valida dbo.empleados al emitir token; aquí se revalida fila por request (defensa en profundidad).
 */
export async function resolveVerifierEmployeeId(
  authUser: AuthUserContext
): Promise<number> {
  if (authUser.role !== "empleado") {
    throw new ForbiddenError("Se requiere sesión de empleado.", "FORBIDDEN");
  }
  const employeeId = authUser.employeeId;
  if (employeeId === undefined || !Number.isSafeInteger(employeeId) || employeeId <= 0) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }

  const empleado = await findEmpleadoById(employeeId);
  if (!empleado) {
    throw new ForbiddenError("Empleado verificador no encontrado.", "EMPLOYEE_NOT_FOUND");
  }

  return employeeId;
}

function assertNotDisabled(estado: string): void {
  if (estado === "deshabilitado") {
    throw new ConflictError(
      "El medio de pago está deshabilitado.",
      "PAYMENT_METHOD_DISABLED"
    );
  }
}

/**
 * Tras UPDATE sin filas: carrera con disable del cliente u otro cambio de estado.
 */
async function resolveUpdateMissed(
  paymentMethodId: number,
  updated: MedioPagoRow | null
): Promise<MedioPagoRow> {
  if (updated) {
    return updated;
  }
  const current = await adminRepository.findById(paymentMethodId);
  if (!current) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }
  if (current.estado === "deshabilitado") {
    throw new ConflictError(
      "El medio de pago está deshabilitado.",
      "PAYMENT_METHOD_DISABLED"
    );
  }
  throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
}

export async function listPaymentMethodsForReview(
  authUser: AuthUserContext,
  query: AdminPaymentMethodListQuery
) {
  await resolveVerifierEmployeeId(authUser);
  const rows = await adminRepository.listForAdmin(query.status);
  return { items: rows.map(mapAdminListRow) };
}

export async function verifyPaymentMethod(authUser: AuthUserContext, id: number) {
  const verifierId = await resolveVerifierEmployeeId(authUser);
  const existing = await adminRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }

  assertNotDisabled(existing.estado);

  if (existing.estado === "verificado") {
    return mapVerifyResponse(existing);
  }

  if (existing.estado === "pendiente" || existing.estado === "rechazado") {
    const updated = await resolveUpdateMissed(
      id,
      await adminRepository.verifyById(id, verifierId)
    );
    void notifyPaymentMethodVerified({
      clienteId: existing.cliente,
      paymentMethodId: id,
      entity: existing.entidad,
      lastDigits: existing.ultimosDigitos,
    });
    return mapVerifyResponse(updated);
  }

  throw new ConflictError(
    "No se puede verificar el medio de pago en su estado actual.",
    "PAYMENT_METHOD_STATUS_INVALID"
  );
}

/**
 * Rechazo administrativo: también revoca un medio ya verificado (verificado → rechazado).
 * Deja de habilitar pujas futuras; no altera operaciones históricas ya registradas.
 */
export async function rejectPaymentMethod(
  authUser: AuthUserContext,
  id: number,
  body: RejectPaymentMethodBody
) {
  const verifierId = await resolveVerifierEmployeeId(authUser);
  const reason = body.reason.trim();

  const existing = await adminRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }

  assertNotDisabled(existing.estado);

  if (
    existing.estado === "pendiente" ||
    existing.estado === "rechazado" ||
    existing.estado === "verificado"
  ) {
    const updated = await resolveUpdateMissed(
      id,
      await adminRepository.rejectById(id, verifierId, reason)
    );
    void notifyPaymentMethodRejected({
      clienteId: existing.cliente,
      paymentMethodId: id,
      reason,
    });
    return mapRejectResponse(updated);
  }

  throw new ConflictError(
    "No se puede rechazar el medio de pago en su estado actual.",
    "PAYMENT_METHOD_STATUS_INVALID"
  );
}
