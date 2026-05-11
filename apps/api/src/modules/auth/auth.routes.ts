import { Router } from "express";
import {
  placeholderChangeInitialPassword,
  placeholderLogin,
  placeholderLogout,
  register,
} from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", placeholderLogin);
authRoutes.post("/change-initial-password", placeholderChangeInitialPassword);
authRoutes.post("/logout", placeholderLogout);
