import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { usersRoutes } from "../modules/users/users.routes";
import { paisesRoutes } from "../modules/paises/paises.routes";
import { sectoresRoutes } from "../modules/sectores/sectores.routes";
import { empleadosRoutes } from "../modules/empleados/empleados.routes";
import { subastasRoutes } from "../modules/subastas/subastas.routes";
import { auctionsRoutes } from "../modules/auctions/auctions.routes";
import { itemsRoutes } from "../modules/items/items.routes";
import { productosRoutes } from "../modules/productos/productos.routes";
import { adminRoutes } from "../modules/admin/admin.routes";
import { clientesRoutes } from "../modules/clientes/clientes.routes";
import { clientsRoutes } from "../modules/clients/clients.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/paises", paisesRoutes);
apiRouter.use("/sectores", sectoresRoutes);
apiRouter.use("/empleados", empleadosRoutes);
apiRouter.use("/subastas", subastasRoutes);
apiRouter.use("/auctions", auctionsRoutes);
apiRouter.use("/items", itemsRoutes);
apiRouter.use("/productos", productosRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/clientes", clientesRoutes);
apiRouter.use("/clients", clientsRoutes);
