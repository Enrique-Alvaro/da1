import { randomUUID } from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { getEnv } from "../../config/env";
import { InternalServerError, UnauthorizedError } from "../errors/httpErrors";

export type LoginTokenType = "initial_password_change" | "access";

/** Minimal JWT claims for login — no profile secrets. */
export type LoginAccessPayload = {
  sub: string;
  email: string;
  type: LoginTokenType;
  jti: string;
};

/** Verified access token (includes `exp` / expiry from JWT). */
export type JwtAuthPayload = LoginAccessPayload & {
  exp: number;
  expiresAt: Date;
};

function requireJwtSecret(): string {
  const secret = getEnv().JWT_SECRET?.trim();
  if (!secret) {
    throw new InternalServerError(
      "JWT_SECRET no configurado. Defínelo en apps/api/.env (copia desde .env.example) y reinicia el servidor."
    );
  }
  return secret;
}

export function buildLoginTokenPayload(params: {
  userId: string;
  email: string;
  tokenType: LoginTokenType;
}): LoginAccessPayload {
  return {
    sub: params.userId,
    email: params.email.toLowerCase(),
    type: params.tokenType,
    jti: randomUUID(),
  };
}

export function signAccessToken(payload: LoginAccessPayload): string {
  const secret = requireJwtSecret();
  const expiresRaw = getEnv().JWT_EXPIRES_IN?.trim() || "15m";
  const options: SignOptions = {
    expiresIn: expiresRaw as SignOptions["expiresIn"],
    jwtid: payload.jti,
    issuer: "crownbid-api",
  };
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      type: payload.type,
      jti: payload.jti,
    },
    secret,
    options
  );
}

export function verifyAccessToken(token: string): JwtAuthPayload {
  const secret = requireJwtSecret();
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secret, {
      issuer: "crownbid-api",
    }) as jwt.JwtPayload;
  } catch {
    throw new UnauthorizedError("No autorizado.");
  }

  const subRaw = typeof decoded.sub === "string" ? decoded.sub : undefined;
  const sub = subRaw?.trim();
  const emailRaw = decoded.email;
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  const type = decoded.type as LoginTokenType | undefined;
  const jtiRaw = decoded.jti;
  const jti = typeof jtiRaw === "string" ? jtiRaw.trim() : "";
  const exp =
    typeof decoded.exp === "number" && Number.isFinite(decoded.exp) ? decoded.exp : undefined;

  if (
    !sub ||
    typeof emailRaw !== "string" ||
    !email ||
    !jti ||
    exp === undefined ||
    (type !== "access" && type !== "initial_password_change")
  ) {
    throw new UnauthorizedError("No autorizado.");
  }

  return {
    sub,
    email,
    type,
    jti,
    exp,
    expiresAt: new Date(exp * 1000),
  };
}
