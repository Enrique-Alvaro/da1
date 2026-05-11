import * as usersRepository from "../../modules/users/users.repository";
import { mapUserRowToApi } from "../../modules/users/user.mapper";
import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors";
import { asyncHandler } from "../utils/asyncHandler";

function bit(v: boolean | Buffer | undefined): boolean {
  if (Buffer.isBuffer(v)) {
    return v[0] === 1;
  }
  return Boolean(v);
}

/**
 * After `requireAuth` + `requireAccessToken`: loads profile and blocks operational use
 * until initial password change is done. Intended for bids, payments, etc. — not for `GET /users/me`.
 */
export const requireOperationalUser = asyncHandler(async (req, _res, next) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }

  const row = await usersRepository.findUserById(req.authUser.id);
  if (!row) {
    throw new UnauthorizedError("No autorizado.");
  }

  if (bit(row.requires_password_change)) {
    throw new ForbiddenError(
      "Debés completar el cambio inicial de contraseña antes de usar esta función."
    );
  }

  req.currentUser = mapUserRowToApi(row);
  next();
});
