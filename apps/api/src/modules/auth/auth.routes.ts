import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import {
  changeInitialPassword,
  forgotPassword,
  logout,
  login,
  register,
  resetPassword,
} from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/change-initial-password", changeInitialPassword);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);
authRoutes.post("/logout", requireAuth, requireAccessToken, logout);
