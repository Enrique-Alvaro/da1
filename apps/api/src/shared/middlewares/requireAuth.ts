import { UnauthorizedError } from "../errors/httpErrors";
import { extractBearerToken } from "../security/bearerToken";
import { verifyAccessToken } from "../security/jwt";
import type { AuthTokenType } from "../types/auth";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Validates `Authorization: Bearer`, verifies JWT (stateless), attaches `req.authUser`.
 * No comprobación de revocación en base de datos.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  const payload = verifyAccessToken(token);

  req.authUser = {
    id: payload.sub,
    email: payload.email,
    tokenType: payload.type as AuthTokenType,
    jti: payload.jti,
    exp: payload.exp,
    expiresAt: payload.expiresAt,
  };
  next();
});
