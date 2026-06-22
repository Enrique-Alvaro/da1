import { z } from "zod";
import { formatZodError } from "../auth/auth.schemas";

export { formatZodError };

const timeSchema = z
  .string()
  .trim()
  .regex(/^\d{1,2}:\d{2}(:\d{2})?$/, "Hora inválida (use HH:mm o HH:mm:ss)");

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (use YYYY-MM-DD)");

export const createAuctionBodySchema = z
  .object({
    fecha: dateSchema,
    hora: timeSchema,
    horaFin: timeSchema,
    estado: z.enum(["abierta", "carrada"]).nullable().optional(),
    subastador: z.coerce.number().int().positive().nullable().optional(),
    ubicacion: z.string().trim().min(1).max(350),
    capacidadAsistentes: z.coerce.number().int().positive().nullable().optional(),
    tieneDeposito: z.enum(["si", "no"]).optional().default("si"),
    seguridadPropia: z.enum(["si", "no"]).optional().default("si"),
    categoria: z.enum(["comun", "especial", "plata", "oro", "platino"]),
    moneda: z.enum(["ARS", "USD"]).optional().default("ARS"),
  })
  .strict();

export const updateAuctionBodySchema = createAuctionBodySchema.partial().strict();

export const auctionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateAuctionBody = z.infer<typeof createAuctionBodySchema>;
export type UpdateAuctionBody = z.infer<typeof updateAuctionBodySchema>;
