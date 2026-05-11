import type { RequestHandler } from "express";
import { NotImplementedError } from "../../shared/errors/httpErrors";

const phase = "Phase 2";

function notImplemented(message: string): RequestHandler {
  return (_req, _res, next) => {
    next(new NotImplementedError(message));
  };
}

/** POST /api/auth/register */
export const placeholderRegister = notImplemented(
  `POST /api/auth/register will be implemented in ${phase}.`
);

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
