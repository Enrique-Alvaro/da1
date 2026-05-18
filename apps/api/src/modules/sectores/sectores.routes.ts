import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import {
  createSector,
  getSector,
  listSectores,
  removeSector,
  updateSector,
} from "./sectores.controller";

export const sectoresRoutes = Router();

sectoresRoutes.use(requireAuth, requireAccessToken);

sectoresRoutes.get("/", listSectores);
sectoresRoutes.get("/:id", getSector);
sectoresRoutes.post("/", createSector);
sectoresRoutes.put("/:id", updateSector);
sectoresRoutes.delete("/:id", removeSector);
