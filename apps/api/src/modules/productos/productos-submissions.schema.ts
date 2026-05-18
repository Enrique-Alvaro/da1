import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";
import { MAX_PRODUCT_IMAGES, MIN_PRODUCT_IMAGES } from "../../shared/validation/productImages";

export { formatZodError };

const imageSchema = z.object({
  filename: z.string().trim().min(1, "filename es obligatorio").max(255),
  mimeType: z.string().trim().min(1, "mimeType es obligatorio").max(100),
  base64: z.string().trim().min(1, "base64 es obligatorio"),
});

const declarationsSchema = z
  .object({
    legitimateOwner: z.boolean(),
    noLegalRestrictions: z.boolean(),
    acceptsDocumentationRequest: z.boolean(),
    acceptsReturnCostsIfRejected: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const fields: (keyof typeof d)[] = [
      "legitimateOwner",
      "noLegalRestrictions",
      "acceptsDocumentationRequest",
      "acceptsReturnCostsIfRejected",
    ];
    for (const key of fields) {
      if (d[key] !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Todas las declaraciones deben aceptarse.",
          path: [key],
        });
      }
    }
  });

export const createProductSubmissionBodySchema = z.object({
  catalogDescription: z
    .string()
    .trim()
    .min(1, "catalogDescription es obligatorio")
    .max(500),
  fullDescriptionUrl: z
    .string()
    .trim()
    .url("fullDescriptionUrl debe ser una URL válida")
    .max(300),
  images: z
    .array(imageSchema)
    .min(MIN_PRODUCT_IMAGES, `Se requieren al menos ${MIN_PRODUCT_IMAGES} imágenes`)
    .max(MAX_PRODUCT_IMAGES),
  declarations: declarationsSchema,
});

export type CreateProductSubmissionBody = z.infer<typeof createProductSubmissionBodySchema>;

export const productSubmissionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const adminDecisionBodySchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export type AdminDecisionBody = z.infer<typeof adminDecisionBodySchema>;

export const auctionAssignmentBodySchema = z
  .object({
    catalogId: z.coerce.number().int().positive().optional(),
    subastaId: z.coerce.number().int().positive().optional(),
    catalogDescription: z.string().trim().min(1).max(250).optional(),
    precioBase: z.coerce.number().positive("precioBase debe ser mayor a 0.01"),
    comision: z.coerce.number().positive("comision debe ser mayor a 0.01"),
  })
  .superRefine((data, ctx) => {
    if (data.catalogId !== undefined && data.subastaId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indicá solo catalogId o solo subastaId, no ambos.",
        path: ["subastaId"],
      });
    }
    if (data.catalogId === undefined && data.subastaId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indicá catalogId o subastaId para asignar el producto.",
        path: ["catalogId"],
      });
    }
    if (data.catalogId === undefined && data.subastaId !== undefined && !data.catalogDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "catalogDescription es obligatorio al crear un catálogo nuevo.",
        path: ["catalogDescription"],
      });
    }
  });

export const productSubmissionPhotoParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  photoId: z.coerce.number().int().positive(),
});

export type AuctionAssignmentBody = z.infer<typeof auctionAssignmentBodySchema>;
