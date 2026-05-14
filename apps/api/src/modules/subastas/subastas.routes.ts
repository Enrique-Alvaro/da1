import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { getSubasta, listSubastas } from "./subastas.controller";

export const subastasRoutes = Router();

subastasRoutes.use(requireAuth, requireAccessToken);

subastasRoutes.get("/", listSubastas);
subastasRoutes.get("/:id", getSubasta);
