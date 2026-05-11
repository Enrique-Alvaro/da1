import type { RequestHandler } from "express";
import { NotImplementedError, ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { formatZodError, loginBodySchema, registerBodySchema } from "./auth.schemas";
import * as authService from "./auth.service";

/** Next milestone for endpoints still not implemented (change-password, logout). */
const nextPhase = "Phase 4";

function notImplemented(message: string): RequestHandler {
  return (_req, _res, next) => {
    next(new NotImplementedError(message));
  };
}

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
export const placeholderChangeInitialPassword = notImplemented(
  `POST /api/auth/change-initial-password will be implemented in ${nextPhase}.`
);

/** POST /api/auth/logout */
export const placeholderLogout = notImplemented(
  `POST /api/auth/logout will be implemented in ${nextPhase}.`
);
