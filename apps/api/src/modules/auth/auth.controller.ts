import type { RequestHandler } from "express";
import { NotImplementedError } from "../../shared/errors/httpErrors";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { formatZodError, registerBodySchema } from "./auth.schemas";
import * as authService from "./auth.service";

const phase = "Phase 3";

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
export const placeholderLogin = notImplemented(
  `POST /api/auth/login will be implemented in ${phase}.`
);

/** POST /api/auth/change-initial-password */
export const placeholderChangeInitialPassword = notImplemented(
  `POST /api/auth/change-initial-password will be implemented in ${phase}.`
);

/** POST /api/auth/logout */
export const placeholderLogout = notImplemented(
  `POST /api/auth/logout will be implemented in ${phase}.`
);
