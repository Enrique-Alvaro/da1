import express from "express";
import { healthRoutes } from "./modules/health/health.routes";
import { apiRouter } from "./routes";
import { errorMiddleware } from "./shared/errors/errorMiddleware";
import { notFoundMiddleware } from "./shared/middlewares/notFoundMiddleware";
import { requestLogger } from "./shared/middlewares/requestLogger";

export function createApp(): express.Application {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.use((req, res, next) => {
    const allowedOrigins = [
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006",
      "http://localhost:19000",
      "http://127.0.0.1:19000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(requestLogger);

  app.use("/health", healthRoutes);
  app.use("/api/health", healthRoutes);

  app.use("/api", apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
