/** Spanish user-facing messages for bid/access denial API codes. */
export const BID_DENIAL_MESSAGES: Record<string, string> = {
  USER_NOT_AUTHENTICATED: 'Debés iniciar sesión para pujar.',
  USER_NOT_ADMITTED: 'Tu cuenta aún no fue aprobada.',
  CATEGORY_NOT_ALLOWED: 'Tu categoría no alcanza para esta subasta.',
  PAYMENT_METHOD_REQUIRED: 'Necesitás registrar un medio de pago.',
  PAYMENT_METHOD_NOT_VERIFIED: 'Tu medio de pago aún no fue verificado.',
  AUCTION_NOT_OPEN: 'La subasta no está abierta en este momento.',
  LIVE_SESSION_REQUIRED: 'Debés unirte a la sesión en vivo para pujar.',
  LIVE_SESSION_OTHER_AUCTION: 'Tenés una sesión activa en otra subasta.',
  OWNER_CANNOT_BID: 'No podés pujar sobre un artículo propio.',
  BID_TOO_LOW: 'El monto está por debajo del mínimo permitido.',
  BID_TOO_HIGH: 'El monto supera el máximo permitido para esta subasta.',
  BID_AMOUNT_INVALID: 'Ingresá un monto numérico válido.',
  ITEM_NOT_CURRENT: 'Solo podés pujar por el artículo en curso.',
  GUARANTEE_LIMIT_EXCEEDED: 'El monto supera tu garantía disponible.',
  PAYMENT_METHOD_CURRENCY_MISMATCH: 'El medio de pago no coincide con la moneda de la subasta.',
  BID_CONFLICT: 'Otra puja se registró primero. Actualizá el monto e intentá de nuevo.',
};

export function resolveBidErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
    if (code && BID_DENIAL_MESSAGES[code]) {
      return BID_DENIAL_MESSAGES[code];
    }
    if ('message' in error && typeof (error as { message: string }).message === 'string') {
      return (error as { message: string }).message;
    }
  }
  return 'No se pudo registrar la puja.';
}
