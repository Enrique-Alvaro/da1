/**
 * Standard success envelope (optional; health endpoints use a small inline shape).
 */
export function ok<T extends Record<string, unknown>>(data: T): T {
  return data;
}
