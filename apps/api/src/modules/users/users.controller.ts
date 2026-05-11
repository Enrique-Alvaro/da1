import type { RequestHandler } from "express";
import { NotImplementedError } from "../../shared/errors/httpErrors";

/** GET /api/users/me */
export const placeholderMe: RequestHandler = (_req, _res, next) => {
  next(new NotImplementedError("GET /api/users/me will be implemented in Phase 5."));
};
