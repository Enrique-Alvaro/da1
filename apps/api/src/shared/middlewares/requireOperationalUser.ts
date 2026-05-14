import * as authRepository from "../../modules/auth/auth.repository";
import { mapPersonaClienteToUserPublic } from "../../modules/users/user.mapper";
import * as usersRepository from "../../modules/users/users.repository";
import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors";
import { asyncHandler } from "../utils/asyncHandler";

function bit(v: boolean | Buffer | undefined): boolean {
  if (Buffer.isBuffer(v)) {
    return v[0] === 1;
  }
  return Boolean(v);
}

/**
 * Tras `requireAuth` + `requireAccessToken`: exige contraseña definitiva (no primer login).
 */
export const requireOperationalUser = asyncHandler(async (req, _res, next) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }

  const pid = Number.parseInt(req.authUser.id, 10);
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }

  const flags = await authRepository.findCredentialFlagsByPersonaId(pid);
  if (!flags) {
    throw new UnauthorizedError("No autorizado.");
  }

  if (bit(flags.requires_password_change)) {
    throw new ForbiddenError(
      "Debés completar el cambio inicial de contraseña antes de usar esta función."
    );
  }

  const profile = await usersRepository.findProfileByPersonId(pid);
  if (!profile) {
    throw new UnauthorizedError("No autorizado.");
  }

  req.currentUser = mapPersonaClienteToUserPublic(profile);
  next();
});
