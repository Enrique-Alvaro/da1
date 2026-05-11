import { UnauthorizedError } from "../errors/httpErrors";

/**
 * Parses `Authorization: Bearer <token>` only.
 */
export function extractBearerToken(authorizationHeader?: string): string {
  const raw = authorizationHeader?.trim();
  if (!raw) {
    throw new UnauthorizedError("Token ausente o inválido.");
  }
  const parts = raw.split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    throw new UnauthorizedError("Token ausente o inválido.");
  }
  const token = parts[1]?.trim();
  if (!token) {
    throw new UnauthorizedError("Token ausente o inválido.");
  }
  return token;
}
