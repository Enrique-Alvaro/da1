import type { AuthUserContext } from "./auth";
import type { UserPublic } from "../../modules/users/user.mapper";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUserContext;
      /** Set by `requireOperationalUser` when the user may proceed past operational gates. */
      currentUser?: UserPublic;
    }
  }
}

export {};
