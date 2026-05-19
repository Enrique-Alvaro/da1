import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors";
import { asyncHandler } from "../utils/asyncHandler";

/** After requireAuth + requireAccessToken: only empleado JWT. */
export const requireEmployeeAuth = asyncHandler(async (req, _res, next) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  if (req.authUser.role !== "empleado") {
    throw new ForbiddenError("Se requiere sesión de empleado.");
  }
  if (req.authUser.employeeId === undefined || req.authUser.employeeId <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }
  next();
});
