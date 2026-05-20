import type { Request, Response } from "express";
import { ZodError } from "zod";
import { BadRequestError } from "../../shared/errors/httpErrors";
import {
  assertNoForbiddenBidBodyKeys,
  createBidBodySchema,
  formatZodError,
  subastasIdParamSchema,
} from "./pujos.schema";
import { createBid, registerAsistenteForAuction } from "./pujos.service";

export async function registerAsistente(req: Request, res: Response): Promise<void> {
  const params = subastasIdParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError(formatZodError(params.error));
  }
  const row = await registerAsistenteForAuction(req.authUser, params.data.id);
  res.status(201).json({
    id: row.identificador,
    auctionId: row.subasta,
    clientId: row.cliente,
    bidderNumber: row.numeroPostor,
  });
}

export async function postBid(req: Request, res: Response): Promise<void> {
  try {
    assertNoForbiddenBidBodyKeys(req.body);
  } catch (e) {
    if (e instanceof ZodError) {
      throw new BadRequestError(formatZodError(e), "BODY_FIELD_NOT_ALLOWED");
    }
    throw e;
  }
  const params = subastasIdParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError(formatZodError(params.error));
  }
  const parsed = createBidBodySchema.safeParse(req.body);
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "paymentMethodId")) {
      throw new BadRequestError(
        "paymentMethodId es obligatorio.",
        "PAYMENT_METHOD_REQUIRED"
      );
    }
    throw new BadRequestError(formatZodError(parsed.error));
  }
  const result = await createBid(req.authUser, params.data.id, parsed.data);
  res.status(201).json(result);
}
