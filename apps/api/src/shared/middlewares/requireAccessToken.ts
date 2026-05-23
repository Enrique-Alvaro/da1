import type { RequestHandler } from "express";
import { UnauthorizedError } from "../errors/httpErrors";

/** Ejecutar después de `requireAuth`. Rechaza JWT de primer login (`initial_password_change`). */
export const requireAccessToken: RequestHandler = (req, _res, next) => {
  if (!req.authUser) {
    next(new UnauthorizedError("No autorizado."));
    return;
  }
  if (req.authUser.tokenType !== "access") {
    next(
      new UnauthorizedError("Se requiere una sesión normal para acceder a este recurso.")
    );
    return;
  }
  next();
};
