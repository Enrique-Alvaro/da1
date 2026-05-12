import type { AuthUserContext } from "./auth";
import type { UserPublic } from "../../modules/users/user.mapper";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUserContext;
      /** Tras `requireOperationalUser`: perfil + email (credencial). */
      currentUser?: UserPublic;
    }
  }
}

export {};
