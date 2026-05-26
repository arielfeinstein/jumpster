import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "@/pages/api/levels/mine";
import { getAuthUser } from "@/lib/auth";
import * as levelService from "@/services/levelService";
import { makeReq, makeRes } from "../../../helpers/apiHelpers";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/services/levelService", () => ({
  listMyLevels: vi.fn(),
}));

const mockUser = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(mockUser as any);
});

describe("GET /api/levels/mine", () => {
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

  /** Returns the current user's levels scoped by their user ID. */
  it("returns 200 with the user's levels", async () => {
    const levels = [{ id: "my-1" }, { id: "my-2" }];
    vi.mocked(levelService.listMyLevels).mockResolvedValue(levels as any);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }), res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ levels });
    expect(levelService.listMyLevels).toHaveBeenCalledWith(mockUser.id);
  });
});
