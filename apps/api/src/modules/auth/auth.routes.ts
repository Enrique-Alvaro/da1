import { Router } from "express";
import {
  placeholderChangeInitialPassword,
  placeholderLogin,
  placeholderLogout,
  placeholderRegister,
} from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", placeholderRegister);
authRoutes.post("/login", placeholderLogin);
authRoutes.post("/change-initial-password", placeholderChangeInitialPassword);
authRoutes.post("/logout", placeholderLogout);
