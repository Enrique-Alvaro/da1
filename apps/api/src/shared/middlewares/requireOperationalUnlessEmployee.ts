import { asyncHandler } from "../utils/asyncHandler";
import { requireAdmittedCliente } from "./requireAdmittedCliente";
import { requireOperationalUser } from "./requireOperationalUser";

export const requireOperationalUserUnlessEmployee = asyncHandler(async (req, res, next) => {
  if (req.authUser?.role === "empleado") {
    next();
    return;
  }
  return requireOperationalUser(req, res, next);
});

export const requireAdmittedClienteUnlessEmployee = asyncHandler(async (req, res, next) => {
  if (req.authUser?.role === "empleado") {
    next();
    return;
  }
  return requireAdmittedCliente(req, res, next);
});
