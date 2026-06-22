import { describe, expect, it, vi, beforeEach } from "vitest";
import * as notificationsService from "../src/modules/notifications/notifications.service";
import * as usersRepository from "../src/modules/users/users.repository";
import { notifySubmissionCustodyUpdated } from "../src/modules/notifications/notifications.events";

describe("notifySubmissionCustodyUpdated", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates notification for product owner cliente", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "comun",
    });
    const createSpy = vi
      .spyOn(notificationsService, "createNotificationSafe")
      .mockResolvedValue();

    await notifySubmissionCustodyUpdated({
      ownerDuenioId: 7,
      submissionId: 100,
      itemTitle: "Rolex",
      kind: "deposit",
      depositLocation: "Depósito Central",
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 7,
        type: "submission_custody_updated",
        title: "Tu artículo fue actualizado",
        submissionId: 100,
        message: expect.stringContaining("Rolex"),
      })
    );
  });

  it("does not notify when owner is not a cliente", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    const createSpy = vi
      .spyOn(notificationsService, "createNotificationSafe")
      .mockResolvedValue();

    await notifySubmissionCustodyUpdated({
      ownerDuenioId: 99,
      submissionId: 100,
      itemTitle: "Rolex",
      kind: "insurance",
      insurancePolicy: "POL-1",
      insuranceCompany: "Sancor",
    });

    expect(createSpy).not.toHaveBeenCalled();
  });
});
