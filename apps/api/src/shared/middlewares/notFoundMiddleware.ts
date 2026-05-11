import type { RequestHandler } from "express";
import { NotFoundError } from "../errors/httpErrors";

export const notFoundMiddleware: RequestHandler = (req, res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};
