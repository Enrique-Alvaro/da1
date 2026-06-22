import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireEmployeeAuth } from "../../shared/middlewares/requireEmployeeAuth";
import { getEmpleado, getEmpleadoMe, listEmpleados } from "./empleados.controller";

export const empleadosRoutes = Router();

empleadosRoutes.use(requireAuth, requireAccessToken);

empleadosRoutes.get("/me", requireEmployeeAuth, getEmpleadoMe);
empleadosRoutes.get("/", listEmpleados);
empleadosRoutes.get("/:id", getEmpleado);
