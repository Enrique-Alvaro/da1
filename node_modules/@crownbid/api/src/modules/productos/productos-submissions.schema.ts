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

const fotoStringSchema = z.string().trim().min(1);

export const createSolicitudBodySchema = z
  .object({
    nombre: z.string().trim().min(1, "nombre es obligatorio").max(500),
    descripcion: z.string().trim().min(1, "descripcion es obligatorio").max(2000),
    historia: z.string().trim().max(2000).optional(),
    artistaODisenador: z.string().trim().max(200).nullable().optional(),
    fechaOrigen: z.string().trim().max(50).optional(),
    valorEstimado: z.coerce.number().positive().optional(),
    fullDescriptionUrl: z.string().trim().url().max(300).optional(),
    documentacionUrl: z.string().trim().url().max(300).optional(),
    declaracionPropiedad: z.literal(true, {
      errorMap: () => ({ message: "declaracionPropiedad debe ser true" }),
    }),
    declaracionSinImpedimentos: z.literal(true, {
      errorMap: () => ({ message: "declaracionSinImpedimentos debe ser true" }),
    }),
    origenLicitoDeclarado: z.literal(true, {
      errorMap: () => ({ message: "origenLicitoDeclarado debe ser true" }),
    }),
    fotos: z
      .array(z.union([fotoStringSchema, imageSchema]))
      .min(MIN_PRODUCT_IMAGES, `Se requieren al menos ${MIN_PRODUCT_IMAGES} fotos`)
      .max(MAX_PRODUCT_IMAGES),
  })
  .transform((data): CreateProductSubmissionBody => {
    const parts = [data.nombre, data.descripcion];
    if (data.historia) {
      parts.push(`Historia: ${data.historia}`);
    }
    if (data.artistaODisenador) {
      parts.push(`Artista/diseñador: ${data.artistaODisenador}`);
    }
    if (data.fechaOrigen) {
      parts.push(`Origen: ${data.fechaOrigen}`);
    }
    if (data.valorEstimado !== undefined) {
      parts.push(`Valor estimado: ${data.valorEstimado}`);
    }
    const catalogDescription = parts.join(" | ").slice(0, 500);
    const fullDescriptionUrl =
      data.fullDescriptionUrl ??
      data.documentacionUrl ??
      "https://crownbid.local/submission-docs/pending";

    const images = data.fotos.map((foto, index) => {
      if (typeof foto === "string") {
        return {
          filename: `foto-${index + 1}.jpg`,
          mimeType: "image/jpeg",
          base64: foto,
        };
      }
      return foto;
    });

    return {
      catalogDescription,
      fullDescriptionUrl,
      images,
      declarations: {
        legitimateOwner: data.declaracionPropiedad,
        noLegalRestrictions: data.declaracionSinImpedimentos,
        acceptsDocumentationRequest: data.origenLicitoDeclarado,
        acceptsReturnCostsIfRejected: true,
      },
    };
  });

export type CreateSolicitudBody = z.input<typeof createSolicitudBodySchema>;

export const adminAcceptSubmissionBodySchema = z.object({
  basePrice: z.coerce.number().positive("basePrice debe ser mayor a 0"),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type AdminAcceptSubmissionBody = z.infer<typeof adminAcceptSubmissionBodySchema>;

export const adminRejectSubmissionBodySchema = z.object({
  reason: z.string().trim().min(1, "reason es obligatorio").max(1000),
  returnChargeAmount: z.coerce.number().nonnegative().optional(),
});

export type AdminRejectSubmissionBody = z.infer<typeof adminRejectSubmissionBodySchema>;

export const assignSolicitudBodySchema = z
  .object({
    auctionId: z.coerce.number().int().positive().optional(),
    catalogId: z.coerce.number().int().positive().optional(),
    basePrice: z.coerce.number().positive("basePrice debe ser mayor a 0"),
    commissionPercent: z.coerce.number().min(0).max(100).optional(),
    comision: z.coerce.number().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.catalogId !== undefined && data.auctionId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indicá solo catalogId o solo auctionId, no ambos.",
        path: ["auctionId"],
      });
    }
    if (data.catalogId === undefined && data.auctionId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indicá catalogId o auctionId.",
        path: ["auctionId"],
      });
    }
    if (data.commissionPercent === undefined && data.comision === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indicá commissionPercent o comision.",
        path: ["commissionPercent"],
      });
    }
  })
  .transform((data): AuctionAssignmentBody => {
    const comision =
      data.comision ??
      Math.max(0.01, (data.basePrice * (data.commissionPercent ?? 0)) / 100);
    return {
      catalogId: data.catalogId,
      subastaId: data.auctionId,
      precioBase: data.basePrice,
      comision,
    };
  });

export const adminSubmissionsQuerySchema = z.object({
  status: z.enum(["pending", "accepted", "assigned", "all"]).optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type AssignSolicitudBody = z.infer<typeof assignSolicitudBodySchema>;
