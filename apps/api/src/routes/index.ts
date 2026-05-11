import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { usersRoutes } from "../modules/users/users.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", usersRoutes);
