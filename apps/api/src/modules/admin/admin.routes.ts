import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireEmployeeAuth } from "../../shared/middlewares/requireEmployeeAuth";
import {
  adminDecision,
  auctionAssignment,
  listPendingReview,
} from "../productos/productos-submissions.controller";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAccessToken, requireEmployeeAuth);

adminRoutes.get("/productos/revision", listPendingReview);
adminRoutes.post("/productos/:id/decision", adminDecision);
adminRoutes.patch("/productos/:id/auction-assignment", auctionAssignment);
