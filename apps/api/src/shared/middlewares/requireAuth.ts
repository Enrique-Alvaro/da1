import { UnauthorizedError } from "../errors/httpErrors";
import { extractBearerToken } from "../security/bearerToken";
import { verifyAccessToken } from "../security/jwt";
import type { AuthTokenType } from "../types/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { isTokenRevoked } from "../../modules/auth/revoked-token.repository";

/**
 * Validates `Authorization: Bearer`, verifies JWT, rejects revoked `jti`, attaches `req.authUser`.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  const payload = verifyAccessToken(token);

  if (await isTokenRevoked(payload.jti)) {
    throw new UnauthorizedError("Token revocado.");
  }

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
