/**
 * Seguimiento de sesión en vivo en memoria (`NO_PERSISTED_LIVE_SESSION`).
 * No persiste entre reinicios del proceso ni escalado horizontal.
 * En BD, `asistentes` registra inscripción a la subasta pero no "conectado ahora".
 */

const activeByCliente = new Map<number, number>();

export function getActiveAuctionId(clienteId: number): number | null {
  return activeByCliente.get(clienteId) ?? null;
}

export function enterSession(clienteId: number, auctionId: number): { entered: boolean; previousAuctionId: number | null } {
  const previous = activeByCliente.get(clienteId) ?? null;
  if (previous === auctionId) {
    return { entered: true, previousAuctionId: previous };
  }
  if (previous !== null && previous !== auctionId) {
    return { entered: false, previousAuctionId: previous };
  }
  activeByCliente.set(clienteId, auctionId);
  return { entered: true, previousAuctionId: null };
}

export function leaveSession(clienteId: number, auctionId: number): boolean {
  const current = activeByCliente.get(clienteId);
  if (current === auctionId) {
    activeByCliente.delete(clienteId);
    return true;
  }
  return false;
}

/** @internal pruebas */
export function clearAllLiveSessions(): void {
  activeByCliente.clear();
}
