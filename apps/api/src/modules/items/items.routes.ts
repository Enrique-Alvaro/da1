import { Router } from "express";
import { optionalAuth } from "../../shared/middlewares/optionalAuth";
import { getItem } from "./items.controller";

export const itemsRoutes = Router();

itemsRoutes.get("/:id", optionalAuth, getItem);
