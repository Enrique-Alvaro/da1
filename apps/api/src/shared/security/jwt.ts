import { randomUUID } from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { getEnv } from "../../config/env";
import type { AuthRole } from "../types/auth";
import { InternalServerError, UnauthorizedError } from "../errors/httpErrors";

export type LoginTokenType = "initial_password_change" | "access";

/** Minimal JWT claims for login — no profile secrets. */
export type LoginAccessPayload = {
  sub: string;
  email: string;
  type: LoginTokenType;
  role: AuthRole;
  employeeId?: number;
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
  personaId: number;
  email: string;
  tokenType: LoginTokenType;
}): LoginAccessPayload {
  return {
    sub: String(params.personaId),
    email: params.email.toLowerCase(),
    type: params.tokenType,
    role: "cliente",
    jti: randomUUID(),
  };
}

export function buildEmployeeTokenPayload(params: {
  employeeId: number;
  email: string;
}): LoginAccessPayload {
  return {
    sub: String(params.employeeId),
    email: params.email.toLowerCase(),
    type: "access",
    role: "empleado",
    employeeId: params.employeeId,
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
  const body: Record<string, string | number> = {
    sub: payload.sub,
    email: payload.email,
    type: payload.type,
    role: payload.role,
  };
  if (payload.employeeId !== undefined) {
    body.employeeId = payload.employeeId;
  }
  return jwt.sign(body, secret, options);
}

function parseRole(value: unknown): AuthRole {
  if (value === "empleado") {
    return "empleado";
  }
  return "cliente";
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
  const role = parseRole(decoded.role);
  const jtiRaw = decoded.jti;
  const jti = typeof jtiRaw === "string" ? jtiRaw.trim() : "";
  const exp =
    typeof decoded.exp === "number" && Number.isFinite(decoded.exp) ? decoded.exp : undefined;

  let employeeId: number | undefined;
  if (decoded.employeeId !== undefined) {
    const n =
      typeof decoded.employeeId === "number"
        ? decoded.employeeId
        : Number.parseInt(String(decoded.employeeId), 10);
    if (Number.isSafeInteger(n) && n > 0) {
      employeeId = n;
    }
  }

  if (
    !sub ||
    !/^\d+$/.test(sub) ||
    typeof emailRaw !== "string" ||
    !email ||
    !jti ||
    exp === undefined ||
    (type !== "access" && type !== "initial_password_change")
  ) {
    throw new UnauthorizedError("No autorizado.");
  }

  if (role === "empleado" && (employeeId === undefined || employeeId !== Number.parseInt(sub, 10))) {
    throw new UnauthorizedError("No autorizado.");
  }

  return {
    sub,
    email,
    type,
    role,
    employeeId,
    jti,
    exp,
    expiresAt: new Date(exp * 1000),
  };
}
