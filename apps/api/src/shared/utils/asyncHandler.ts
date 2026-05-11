import type { Request, RequestHandler, Response, NextFunction } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Wraps an async Express handler so rejections are passed to `next()`.
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
