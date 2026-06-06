import express from "express";
import cors from "cors";
import { apiRouter } from "./routes";
import { healthRoutes } from "./modules/health/health.routes";
import { errorMiddleware } from "./shared/errors/errorMiddleware";
import { notFoundMiddleware } from "./shared/middlewares/notFoundMiddleware";
import { requestLogger } from "./shared/middlewares/requestLogger";

export function createApp(): express.Application {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: '20mb' }));
  app.use(requestLogger);

  app.use("/health", healthRoutes);
  app.use("/api/health", healthRoutes);

  app.use("/api", apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
