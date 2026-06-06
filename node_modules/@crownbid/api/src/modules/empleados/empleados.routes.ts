import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { getEmpleado, listEmpleados } from "./empleados.controller";

export const empleadosRoutes = Router();

empleadosRoutes.use(requireAuth, requireAccessToken);

empleadosRoutes.get("/", listEmpleados);
empleadosRoutes.get("/:id", getEmpleado);
