import { Router } from "express";
import { placeholderMe } from "./users.controller";

export const usersRoutes = Router();

usersRoutes.get("/me", placeholderMe);
