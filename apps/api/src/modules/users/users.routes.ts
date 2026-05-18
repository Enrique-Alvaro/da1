import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import {
  cancelMySubmission,
  getMySubmission,
  getMySubmissionPhoto,
  listMySubmissions,
} from "../productos/productos-submissions.controller";
import { getMe } from "./users.controller";

export const usersRoutes = Router();

usersRoutes.get("/me", requireAuth, requireAccessToken, getMe);

const submissionChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

usersRoutes.get("/me/item-submissions", ...submissionChain, listMySubmissions);
usersRoutes.get(
  "/me/item-submissions/:id/photos/:photoId",
  ...submissionChain,
  getMySubmissionPhoto
);
usersRoutes.get("/me/item-submissions/:id", ...submissionChain, getMySubmission);
usersRoutes.delete("/me/item-submissions/:id", ...submissionChain, cancelMySubmission);
