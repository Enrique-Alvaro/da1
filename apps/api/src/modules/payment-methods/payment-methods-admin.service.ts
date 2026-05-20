import type { AuthUserContext } from "../../shared/types/auth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/httpErrors";
import {
  mapAdminListRow,
  mapRejectResponse,
  mapVerifyResponse,
} from "./payment-methods-admin.mapper";
import * as adminRepository from "./payment-methods-admin.repository";
import type {
  AdminPaymentMethodListQuery,
  RejectPaymentMethodBody,
} from "./payment-methods-admin.schema";

/**
 * Verificador = empleado autenticado (JWT role empleado + employeeId).
 * Login: POST /api/auth/employee/login → buildEmployeeTokenPayload.
 */
export function resolveVerifierEmployeeId(authUser: AuthUserContext): number {
  if (authUser.role !== "empleado") {
    throw new ForbiddenError(
      "Se requiere sesión de empleado.",
      "FORBIDDEN"
    );
  }
  const employeeId = authUser.employeeId;
  if (employeeId === undefined || !Number.isSafeInteger(employeeId) || employeeId <= 0) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
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

export async function listPaymentMethodsForReview(
  authUser: AuthUserContext,
  query: AdminPaymentMethodListQuery
) {
  resolveVerifierEmployeeId(authUser);
  const rows = await adminRepository.listForAdmin(query.status);
  return { items: rows.map(mapAdminListRow) };
}

export async function verifyPaymentMethod(authUser: AuthUserContext, id: number) {
  const verifierId = resolveVerifierEmployeeId(authUser);
  const existing = await adminRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }

  assertNotDisabled(existing.estado);

  if (existing.estado === "verificado") {
    return mapVerifyResponse(existing);
  }

  if (
    existing.estado === "pendiente" ||
    existing.estado === "rechazado"
  ) {
    const updated = await adminRepository.verifyById(id, verifierId);
    if (!updated) {
      throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
    }
    return mapVerifyResponse(updated);
  }

  throw new ConflictError(
    "No se puede verificar el medio de pago en su estado actual.",
    "PAYMENT_METHOD_STATUS_INVALID"
  );
}

export async function rejectPaymentMethod(
  authUser: AuthUserContext,
  id: number,
  body: RejectPaymentMethodBody
) {
  const verifierId = resolveVerifierEmployeeId(authUser);
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
    const updated = await adminRepository.rejectById(id, verifierId, reason);
    if (!updated) {
      throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
    }
    return mapRejectResponse(updated);
  }

  throw new ConflictError(
    "No se puede rechazar el medio de pago en su estado actual.",
    "PAYMENT_METHOD_STATUS_INVALID"
  );
}
