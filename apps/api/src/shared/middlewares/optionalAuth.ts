import { extractBearerToken } from "../security/bearerToken";
import { verifyAccessToken } from "../security/jwt";
import type { AuthTokenType } from "../types/auth";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Si `Authorization: Bearer` está presente y es válido, asigna `req.authUser`.
 * Token inválido o ausente deja `authUser` indefinido (rutas públicas de lectura).
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.trim()) {
    next();
    return;
  }
  try {
    const token = extractBearerToken(header);
    const payload = verifyAccessToken(token);
    req.authUser = {
      id: payload.sub,
      email: payload.email,
      tokenType: payload.type as AuthTokenType,
      role: payload.role,
      employeeId: payload.employeeId,
      jti: payload.jti,
      exp: payload.exp,
      expiresAt: payload.expiresAt,
    };
  } catch {
    req.authUser = undefined;
  }
  next();
});
