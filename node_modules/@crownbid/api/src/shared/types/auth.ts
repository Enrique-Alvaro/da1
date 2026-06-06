export type AuthTokenType = "access" | "initial_password_change";

export type AuthRole = "cliente" | "empleado";

export type AuthUserContext = {
  id: string;
  email: string;
  tokenType: AuthTokenType;
  role: AuthRole;
  /** Presente cuando role es empleado (dbo.empleados.identificador). */
  employeeId?: number;
  jti: string;
  exp: number;
  expiresAt: Date;
};
