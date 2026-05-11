import { z } from "zod";

export const registerBodySchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio"),
  lastName: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .transform((s) => s.toLowerCase()),
  documentId: z.string().trim().min(1, "El documento es obligatorio"),
  address: z.string().trim().min(1, "La dirección es obligatoria"),
  country: z
    .string()
    .trim()
    .length(2, "El país debe ser un código ISO de 2 letras")
    .transform((c) => c.toUpperCase()),
  documentFrontImageUrl: z.string().trim().url("URL frontal del documento inválida"),
  documentBackImageUrl: z.string().trim().url("URL trasera del documento inválida"),
});

export type RegisterBodyInput = z.infer<typeof registerBodySchema>;

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}
