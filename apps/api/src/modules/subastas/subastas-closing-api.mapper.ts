import type { FinalizationResponse } from "./subastas-closing.types";

export type FinalizationApiResponse = FinalizationResponse & {
  resultStatus: "FINALIZED" | "NOT_FINALIZED";
  productTitle: string | null;
};

/** Enriquece la respuesta de cierre/resultado para contrato mobile (sin datos sensibles de pago en lectura). */
export function toFinalizationApiResponse(
  row: FinalizationResponse,
  options?: { omitPaymentMethodId?: boolean }
): FinalizationApiResponse {
  const finalized = row.resultType !== "NOT_FINALIZED";
  return {
    ...row,
    resultStatus: finalized ? "FINALIZED" : "NOT_FINALIZED",
    productTitle: row.title ?? null,
    finalAmount: finalized ? row.finalAmount : null,
    totalAmount: finalized ? row.totalAmount : null,
    commissionAmount: finalized ? row.commissionAmount : 0,
    shippingAmount: finalized ? row.shippingAmount : 0,
    paymentMethodId:
      options?.omitPaymentMethodId === true ? null : row.paymentMethodId,
    winnerUserId: finalized ? row.winnerUserId : null,
    winnerDisplayName: finalized ? row.winnerDisplayName : null,
    finalizedAt: finalized ? row.finalizedAt : null,
  };
}
