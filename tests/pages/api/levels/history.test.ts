import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "@/pages/api/levels/history";
import { getAuthUser } from "@/lib/auth";
import * as levelService from "@/services/levelService";
import { makeReq, makeRes } from "../../../helpers/apiHelpers";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/services/levelService", () => ({
  getCompletionHistory: vi.fn(),
}));

const mockUser = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(mockUser as any);
});

describe("GET /api/levels/history", () => {
  /** Rejects methods other than GET. */
  it("returns 405 for non-GET methods", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST" }), res);
    expect(res._status).toBe(405);
  });

  /** Returns 401 when no auth token is provided. */
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }), res);
    expect(res._status).toBe(401);
  });

  /** Returns all completed levels including ghost levels (deletedAt set). */
  it("returns 200 with the user's completion history", async () => {
    const levels = [{ id: "lvl-1", deletedAt: null }, { id: "lvl-2", deletedAt: new Date() }];
    vi.mocked(levelService.getCompletionHistory).mockResolvedValue(levels as any);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }), res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ levels });
    expect(levelService.getCompletionHistory).toHaveBeenCalledWith(mockUser.id);
  });
});
