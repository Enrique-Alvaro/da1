import type { RequestHandler } from "express";
import { UnauthorizedError, ValidationError } from "../../shared/errors/httpErrors";
import { extractBearerToken } from "../../shared/security/bearerToken";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  changeInitialPasswordBodySchema,
  formatZodError,
  loginBodySchema,
  registerBodySchema,
} from "./auth.schemas";
import * as authService from "./auth.service";

/** POST /api/auth/register */
export const register: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = registerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }

  const result = await authService.registerUser(parsed.data);
  res.status(201).json(result);
});

/** POST /api/auth/login */
export const login: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }

  const result = await authService.loginUser(parsed.data);
  res.status(200).json(result);
});

/** POST /api/auth/change-initial-password */
export const changeInitialPassword: RequestHandler = asyncHandler(async (req, res) => {
  const token = extractBearerToken(req.headers.authorization);

  const parsed = changeInitialPasswordBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }

  const result = await authService.changeInitialPassword({
    token,
    ...parsed.data,
  });

  res.status(200).json(result);
});

/** POST /api/auth/logout — Bearer access token only (chain: requireAuth + requireAccessToken). */
export const logout: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }

  await authService.logout(req.authUser);
  res.status(204).send();
});
