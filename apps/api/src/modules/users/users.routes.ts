import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { getMe } from "./users.controller";

export const usersRoutes = Router();

usersRoutes.get("/me", requireAuth, requireAccessToken, getMe);
