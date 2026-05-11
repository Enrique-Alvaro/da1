export type AuthTokenType = "access" | "initial_password_change";

export type AuthUserContext = {
  id: string;
  email: string;
  tokenType: AuthTokenType;
  jti: string;
  exp: number;
  expiresAt: Date;
};
