import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { loginBodySchema, formatZodError } from "./auth.schemas";
import * as authService from "./auth.service";

/** POST /api/auth/employee/login */
export const employeeLogin: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const result = await authService.loginEmployee(parsed.data.email, parsed.data.password);
  res.status(200).json({
    accessToken: result.accessToken,
    employeeId: result.employeeId,
    email: result.email,
    role: "empleado",
  });
});
