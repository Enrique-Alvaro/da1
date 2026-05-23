import { extractBearerToken } from "../security/bearerToken";
import { verifyAccessToken } from "../security/jwt";
import type { AuthTokenType } from "../types/auth";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * If `Authorization: Bearer` is present and valid, sets `req.authUser`.
 * Invalid or missing token leaves `authUser` undefined (public read paths).
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
