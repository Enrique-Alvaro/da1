import type { AuthUserContext } from "../../shared/types/auth";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors/httpErrors";
import * as liveSessionStore from "../subastas/live-session.store";
import * as usersRepository from "./users.repository";
import * as metricsRepository from "./users-metrics.repository";

export async function getMyMetrics(authUser: AuthUserContext) {
  if (authUser.role === "empleado") {
    throw new ForbiddenError("Esta acción no está disponible para empleados.");
  }
  const personId = Number.parseInt(authUser.id, 10);
  if (!Number.isFinite(personId) || personId <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }
  const cliente = await usersRepository.findClienteByPersonId(personId);
  if (!cliente) {
    return {
      totalAuctionsAttended: 0,
      totalWins: 0,
      totalBidsPlaced: 0,
      totalAmountOffered: 0,
      totalAmountWon: 0,
      activeLiveAuctionId: null,
      limitations: ["WINS_FROM_REGISTRO_ONLY"],
    };
  }

  const [attended, bids, offered, wins, wonAmount] = await Promise.all([
    metricsRepository.countAsistenciasByCliente(cliente.identificador),
    metricsRepository.countPujosByCliente(cliente.identificador),
    metricsRepository.sumPujosImporteByCliente(cliente.identificador),
    metricsRepository.countWinsByCliente(cliente.identificador),
    metricsRepository.sumWinsImporteByCliente(cliente.identificador),
  ]);

  return {
    totalAuctionsAttended: attended,
    totalWins: wins,
    totalBidsPlaced: bids,
    totalAmountOffered: offered,
    totalAmountWon: wonAmount,
    activeLiveAuctionId: liveSessionStore.getActiveAuctionId(cliente.identificador),
    derived: true,
    limitations: [
      "WINS_FROM_REGISTRO_ONLY",
      "NO_PERSISTED_FINALIZATION_TIMESTAMP",
    ],
  };
}
