import type { Request, Response } from "express";
import { getEnv } from "../../config/env";
import { testSqlConnection } from "../../db/sqlServer";
import { asyncHandler } from "../../shared/utils/asyncHandler";

export function getHealth(_req: Request, res: Response): void {
  const env = getEnv();
  res.json({
    status: "ok",
    service: "crownbid-api",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}

export const getHealthDb = asyncHandler(async (_req: Request, res: Response) => {
  try {
    await testSqlConnection();
    const env = getEnv();
    res.status(200).json({
      status: "ok",
      service: "crownbid-api",
      environment: env.NODE_ENV,
      database: "reachable",
      timestamp: new Date().toISOString(),
    });
  } catch {
    const env = getEnv();
    res.status(503).json({
      status: "error",
      service: "crownbid-api",
      environment: env.NODE_ENV,
      database: "unreachable",
      message: "No se pudo ejecutar la consulta de prueba en SQL Server.",
      timestamp: new Date().toISOString(),
    });
  }
});
