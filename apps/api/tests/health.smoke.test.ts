import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { getHealth } from "../src/modules/health/health.controller";

describe("Health smoke", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SQLSERVER_CONNECTION_STRING", "Server=localhost;Database=test;User Id=u;Password=p;");
  });

  it("GET /api/health returns ok payload", () => {
    const json = vi.fn();
    const res = { json } as unknown as Response;
    getHealth({} as Request, res);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        service: "crownbid-api",
      })
    );
  });
});
