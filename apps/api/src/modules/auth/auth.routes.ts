import { Router } from "express";
import { changeInitialPassword, placeholderLogout, login, register } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/change-initial-password", changeInitialPassword);
authRoutes.post("/logout", placeholderLogout);
