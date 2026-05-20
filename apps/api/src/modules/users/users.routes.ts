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
import {
  createPaymentMethod,
  disablePaymentMethod,
  listMyPaymentMethods,
} from "../payment-methods/payment-methods.controller";

export const usersRoutes = Router();

usersRoutes.get("/me", requireAuth, requireAccessToken, getMe);

const clientOperationalChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

usersRoutes.get("/me/payment-methods", ...clientOperationalChain, listMyPaymentMethods);
usersRoutes.post("/me/payment-methods", ...clientOperationalChain, createPaymentMethod);
usersRoutes.patch(
  "/me/payment-methods/:id/disable",
  ...clientOperationalChain,
  disablePaymentMethod
);

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
