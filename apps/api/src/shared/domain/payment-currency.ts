import type { MedioPagoRow } from "../../modules/payment-methods/payment-methods.repository";

/** Subasta y medio deben compartir moneda (Fase 1: ARS | USD). */
export function isPaymentCurrencyCompatibleWithAuction(
  medio: Pick<MedioPagoRow, "moneda">,
  auctionCurrency: string
): boolean {
  return medio.moneda.trim().toUpperCase() === auctionCurrency.trim().toUpperCase();
}
