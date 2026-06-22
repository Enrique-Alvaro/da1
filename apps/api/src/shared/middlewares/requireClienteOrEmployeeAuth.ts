import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors";
import { asyncHandler } from "../utils/asyncHandler";

/** Permite JWT de cliente o empleado en rutas de lectura operativa. */
export const requireClienteOrEmployeeAuth = asyncHandler(async (req, _res, next) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  if (req.authUser.role !== "cliente" && req.authUser.role !== "empleado") {
    throw new ForbiddenError("Se requiere sesión de cliente o empleado.");
  }
  next();
});
