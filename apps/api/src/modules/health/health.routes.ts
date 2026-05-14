import { Router } from "express";
import { getHealth, getHealthDb } from "./health.controller";

export const healthRoutes = Router();

healthRoutes.get("/", getHealth);
healthRoutes.get("/db", getHealthDb);
