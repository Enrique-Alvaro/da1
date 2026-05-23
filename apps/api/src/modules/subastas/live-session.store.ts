/**
 * In-memory live session tracking (`NO_PERSISTED_LIVE_SESSION`).
 * Not durable across process restarts or horizontal scaling.
 * DB `asistentes` records auction enrollment but not "connected now".
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

/** @internal tests */
export function clearAllLiveSessions(): void {
  activeByCliente.clear();
}
