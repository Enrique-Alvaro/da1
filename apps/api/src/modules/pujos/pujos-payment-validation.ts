import { isPaymentCurrencyCompatibleWithAuction } from "../../shared/domain/payment-currency";
import { ConflictError, NotFoundError } from "../../shared/errors/httpErrors";

/** Campos mínimos del medio de pago para autorizar una puja. */
export type MedioPagoBidRow = {
  identificador: number;
  cliente: number;
  tipo: string;
  estado: string;
  moneda: string;
  montoDisponible: number | null;
};

/**
 * Valida un medio de pago cargado (p. ej. dentro de transacción con bloqueo).
 * Mismos códigos que la validación previa a insertar la puja.
 */
export function assertPaymentMethodForBid(
  medio: MedioPagoBidRow | null,
  auctionCurrency: string,
  bidAmount: number
): MedioPagoBidRow {
  if (!medio) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }
  switch (medio.estado) {
    case "pendiente":
      throw new ConflictError(
        "El medio de pago está pendiente de verificación.",
        "PAYMENT_METHOD_PENDING_VERIFICATION"
      );
    case "rechazado":
      throw new ConflictError("El medio de pago fue rechazado.", "PAYMENT_METHOD_REJECTED");
    case "deshabilitado":
      throw new ConflictError("El medio de pago está deshabilitado.", "PAYMENT_METHOD_DISABLED");
    case "verificado":
      break;
    default:
      throw new ConflictError(
        "El medio de pago no está verificado.",
        "PAYMENT_METHOD_NOT_VERIFIED"
      );
  }
  if (!isPaymentCurrencyCompatibleWithAuction(medio, auctionCurrency)) {
    throw new ConflictError(
      "La moneda del medio de pago no coincide con la de la subasta.",
      "PAYMENT_METHOD_CURRENCY_MISMATCH"
    );
  }
  if (medio.tipo === "cheque_certificado") {
    if (medio.montoDisponible == null) {
      throw new ConflictError(
        "El cheque certificado no tiene monto disponible configurado.",
        "PAYMENT_METHOD_INSUFFICIENT_FUNDS"
      );
    }
    if (Number(medio.montoDisponible) < bidAmount) {
      throw new ConflictError(
        "El monto disponible del cheque certificado es insuficiente para esta puja.",
        "GUARANTEE_LIMIT_EXCEEDED"
      );
    }
  }
  return medio;
}
