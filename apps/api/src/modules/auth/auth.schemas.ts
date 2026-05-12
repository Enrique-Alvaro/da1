import { z } from "zod";

const MAX_PHOTO_BASE64_CHARS = 6_000_000;

function isReasonableBase64Photo(value: string): boolean {
  const t = value.trim();
  if (t.length === 0) {
    return false;
  }
  if (t.length > MAX_PHOTO_BASE64_CHARS) {
    return false;
  }
  try {
    const buf = Buffer.from(t, "base64");
    if (buf.length === 0) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function refineBase64Optional(path: string, value: string | null | undefined, ctx: z.RefinementCtx) {
  if (value != null && typeof value === "string" && value.trim().length > 0) {
    if (!isReasonableBase64Photo(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Imagen en Base64 inválida o excede el tamaño permitido.",
        path: [path],
      });
    }
  }
}

/** Contrato pantalla registro (Figma): nombre, apellido, email, documento, dirección, país, frente/dorso ID. */
export const registerBodySchema = z
  .object({
    firstName: z.string().trim().min(1, "El nombre es obligatorio").max(75),
    lastName: z.string().trim().min(1, "El apellido es obligatorio").max(75),
    /** Compatibilidad api-docs / clientes antiguos; si viene, se ignora si ya hay firstName + lastName. */
    fullName: z.string().trim().min(1).max(150).optional(),
    email: z
      .string()
      .trim()
      .email("Email inválido")
      .transform((s) => s.toLowerCase()),
    documentNumber: z.string().trim().min(1, "El documento es obligatorio").max(20),
    address: z.union([z.string(), z.null()]).optional(),
    countryId: z.coerce
      .number()
      .int("El país debe ser un entero")
      .positive("El país debe ser un entero positivo"),
    photoBase64: z.union([z.string(), z.null()]).optional(),
    documentFrontImageBase64: z.union([z.string(), z.null()]).optional(),
    documentBackImageBase64: z.union([z.string(), z.null()]).optional(),
  })
  .superRefine((data, ctx) => {
    refineBase64Optional("photoBase64", data.photoBase64, ctx);
    refineBase64Optional("documentFrontImageBase64", data.documentFrontImageBase64, ctx);
    refineBase64Optional("documentBackImageBase64", data.documentBackImageBase64, ctx);
  });

export type RegisterBodyInput = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginBodyInput = z.infer<typeof loginBodySchema>;

export const changeInitialPasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .regex(/[a-z]/, "La nueva contraseña debe contener al menos una minúscula")
      .regex(/[A-Z]/, "La nueva contraseña debe contener al menos una mayúscula"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "La nueva contraseña no puede ser igual a la contraseña temporal",
    path: ["newPassword"],
  });

export type ChangeInitialPasswordBodyInput = z.infer<typeof changeInitialPasswordBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .transform((s) => s.toLowerCase()),
});

export type ForgotPasswordBodyInput = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(10, "El token de restablecimiento es inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[a-z]/, "La contraseña debe contener al menos una minúscula")
    .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
});

export type ResetPasswordBodyInput = z.infer<typeof resetPasswordBodySchema>;

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}
