import * as usersRepository from "../../modules/users/users.repository";
import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors";
import { asyncHandler } from "../utils/asyncHandler";

export const CLIENT_NOT_ADMITTED_MESSAGE =
  "Tu cuenta todavía está pendiente de validación. Podés ver subastas, pero no podés realizar esta acción.";

/**
 * Tras requireAuth + requireAccessToken + requireClienteAuth (+ requireOperationalUser opcional):
 * exige clientes.admitido = 'si' para acciones restringidas (pujas, envíos, etc.).
 */
export const requireAdmittedCliente = asyncHandler(async (req, _res, next) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }

  const personId = Number.parseInt(req.authUser.id, 10);
  if (!Number.isSafeInteger(personId) || personId <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }

  const cliente = await usersRepository.findClienteByPersonId(personId);
  if (!cliente) {
    throw new ForbiddenError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
  }

  if (cliente.admitido.trim().toLowerCase() !== "si") {
    throw new ForbiddenError(CLIENT_NOT_ADMITTED_MESSAGE, "USER_NOT_ADMITTED");
  }

  next();
});
