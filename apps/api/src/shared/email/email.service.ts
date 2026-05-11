import nodemailer from "nodemailer";
import { getEnv } from "../../config/env";
import { InternalServerError } from "../errors/httpErrors";

export type SendTemporaryPasswordParams = {
  to: string;
  firstName: string;
  temporaryPassword: string;
};

function isSmtpConfigured(): boolean {
  const env = getEnv();
  return !!(
    env.SMTP_HOST?.trim() &&
    env.SMTP_PORT &&
    env.SMTP_USER?.trim() &&
    env.SMTP_PASSWORD?.trim() &&
    env.SMTP_FROM?.trim()
  );
}

/**
 * Sends temporary password email via SMTP when configured.
 * Development without SMTP: logs a mock notice (password visible only in non-production).
 * Production without SMTP: fails fast.
 */
export async function sendTemporaryPasswordEmail(params: SendTemporaryPasswordParams): Promise<void> {
  const env = getEnv();
  const { to, firstName, temporaryPassword } = params;

  if (env.NODE_ENV === "production" && !isSmtpConfigured()) {
    throw new InternalServerError(
      "SMTP no configurado: defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM para envío real en producción."
    );
  }

  if (!isSmtpConfigured()) {
    console.warn(
      "[email mock] SMTP no configurado — no se envía correo real. Solo desarrollo / test."
    );
    console.warn(`[email mock] Destinatario: ${to}`);
    if (env.NODE_ENV !== "production") {
      console.warn("[email mock] Contraseña temporal (solo dev):", temporaryPassword);
    }
    return;
  }

  const e = getEnv();
  const transporter = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: {
      user: e.SMTP_USER,
      pass: e.SMTP_PASSWORD,
    },
  });

  const subject = "CrownBid - Contraseña temporal";
  const text = [
    `Hola ${firstName},`,
    "",
    "Tu cuenta en CrownBid fue creada. Tu contraseña temporal es:",
    "",
    temporaryPassword,
    "",
    "Volvé a la pantalla de inicio de sesión en la app e ingresá esta contraseña.",
    "En el primer acceso la aplicación te pedirá crear una contraseña definitiva.",
    "No compartas esta contraseña con nadie.",
    "",
    "— CrownBid",
  ].join("\n");

  await transporter.sendMail({
    from: e.SMTP_FROM,
    to,
    subject,
    text,
  });
}

export type SendPasswordResetEmailParams = {
  to: string;
  firstName: string;
  /** Full reset URL including query token (never log in production). */
  resetUrl: string;
};

/**
 * Sends password reset link via SMTP when configured.
 * Dev without SMTP: mock log — reset URL printed only when NODE_ENV !== production.
 */
export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void> {
  const env = getEnv();
  const { to, firstName, resetUrl } = params;

  if (env.NODE_ENV === "production" && !isSmtpConfigured()) {
    throw new InternalServerError(
      "SMTP no configurado: defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM para envío real en producción."
    );
  }

  if (!isSmtpConfigured()) {
    console.warn(
      "[email mock] SMTP no configurado — no se envía correo real de restablecimiento. Solo desarrollo / test."
    );
    console.warn(`[email mock] Destinatario: ${to}`);
    if (env.NODE_ENV !== "production") {
      console.warn("[email mock] URL de restablecimiento (solo dev/test):", resetUrl);
    }
    return;
  }

  const e = getEnv();
  const transporter = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: {
      user: e.SMTP_USER,
      pass: e.SMTP_PASSWORD,
    },
  });

  const subject = "CrownBid - Restablecimiento de contraseña";
  const text = [
    `Hola ${firstName},`,
    "",
    "Recibimos una solicitud para restablecer tu contraseña en CrownBid.",
    "Si fuiste vos, abrí el siguiente enlace para definir una nueva contraseña:",
    "",
    resetUrl,
    "",
    "El enlace es de un solo uso y expira pasado un tiempo.",
    "Si no solicitaste el cambio, ignorá este mensaje.",
    "",
    "— CrownBid",
  ].join("\n");

  await transporter.sendMail({
    from: e.SMTP_FROM,
    to,
    subject,
    text,
  });
}
