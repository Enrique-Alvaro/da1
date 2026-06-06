import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Tras requireAuth + requireAccessToken: solo JWT con role empleado y employeeId en claims.
 * No re-consulta dbo.empleados en cada request (el login valida existencia al emitir el token).
 * Los módulos admin sensibles (p. ej. medios de pago) revalidan empleado en el servicio.
 */
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
