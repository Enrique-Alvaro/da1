import type { ErrorRequestHandler } from "express";
import { AppError } from "./AppError";
import { getEnv } from "../../config/env";

export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  const env = getEnv();

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.error,
      message: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  console.error("[UnhandledError]", err);

  const statusCode = 500;
  const body: { error: string; message: string; statusCode: number; stack?: string } = {
    error: "InternalServerError",
    message:
      env.NODE_ENV === "production"
        ? "Error interno del servidor"
        : err instanceof Error
          ? err.message
          : "Error interno del servidor",
    statusCode,
  };

  if (env.NODE_ENV !== "production" && err instanceof Error && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};
