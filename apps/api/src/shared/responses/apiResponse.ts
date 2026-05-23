/**
 * Envelope estándar de éxito (opcional; health usa una forma inline reducida).
 */
export function ok<T extends Record<string, unknown>>(data: T): T {
  return data;
}
