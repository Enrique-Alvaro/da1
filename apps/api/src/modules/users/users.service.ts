import type { AuthUserContext } from "../../shared/types/auth";
import { UnauthorizedError } from "../../shared/errors/httpErrors";
import { mapPersonaClienteToUserPublic } from "./user.mapper";
import * as usersRepository from "./users.repository";

function parsePersonIdFromAuth(authUser: AuthUserContext): number {
  const raw = authUser.id?.trim() ?? "";
  if (!/^\d+$/.test(raw)) {
    throw new UnauthorizedError("No autorizado.");
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }
  return n;
}

/** GET /users/me — requiere token tipo access. */
export async function getCurrentUser(authUser: AuthUserContext) {
  const personId = parsePersonIdFromAuth(authUser);
  const row = await usersRepository.findProfileByPersonId(personId);
  if (!row) {
    throw new UnauthorizedError("No autorizado.");
  }
  return mapPersonaClienteToUserPublic(row);
}
