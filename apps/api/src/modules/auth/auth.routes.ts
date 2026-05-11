import { Router } from "express";
import {
  placeholderChangeInitialPassword,
  placeholderLogout,
  login,
  register,
} from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/change-initial-password", placeholderChangeInitialPassword);
authRoutes.post("/logout", placeholderLogout);
