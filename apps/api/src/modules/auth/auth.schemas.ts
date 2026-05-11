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
      .regex(/[A-Z]/, "La nueva contraseña debe contener al menos una mayúscula")
      .regex(/[0-9]/, "La nueva contraseña debe contener al menos un número"),
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
