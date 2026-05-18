import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import {
  createPais,
  getPais,
  listPaises,
  removePais,
  updatePais,
} from "./paises.controller";

export const paisesRoutes = Router();

paisesRoutes.use(requireAuth, requireAccessToken);

paisesRoutes.get("/", listPaises);
paisesRoutes.get("/:id", getPais);
paisesRoutes.post("/", createPais);
paisesRoutes.put("/:id", updatePais);
paisesRoutes.delete("/:id", removePais);
