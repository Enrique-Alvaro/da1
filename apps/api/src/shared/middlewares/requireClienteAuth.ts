import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors";
import { asyncHandler } from "../utils/asyncHandler";

/** After requireAuth + requireAccessToken: rejects empleado tokens on cliente-only routes. */
export const requireClienteAuth = asyncHandler(async (req, _res, next) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  if (req.authUser.role === "empleado") {
    throw new ForbiddenError("Esta acción no está disponible para empleados.");
  }
  next();
});
