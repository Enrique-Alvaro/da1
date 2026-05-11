import type { AuthUserContext } from "../../shared/types/auth";
import { UnauthorizedError } from "../../shared/errors/httpErrors";
import { mapUserRowToApi } from "./user.mapper";
import * as usersRepository from "./users.repository";

/** Current profile from DB — never trust JWT claims alone for the response body. */
export async function getCurrentUser(authUser: AuthUserContext) {
  const row = await usersRepository.findUserById(authUser.id);
  if (!row) {
    throw new UnauthorizedError("No autorizado.");
  }
  return mapUserRowToApi(row);
}
