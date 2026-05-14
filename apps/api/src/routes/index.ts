import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { usersRoutes } from "../modules/users/users.routes";
import { paisesRoutes } from "../modules/paises/paises.routes";
import { sectoresRoutes } from "../modules/sectores/sectores.routes";
import { empleadosRoutes } from "../modules/empleados/empleados.routes";
import { subastasRoutes } from "../modules/subastas/subastas.routes";
import { productosRoutes } from "../modules/productos/productos.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/paises", paisesRoutes);
apiRouter.use("/sectores", sectoresRoutes);
apiRouter.use("/empleados", empleadosRoutes);
apiRouter.use("/subastas", subastasRoutes);
apiRouter.use("/productos", productosRoutes);
