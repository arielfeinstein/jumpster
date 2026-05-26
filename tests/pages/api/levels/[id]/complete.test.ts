import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "@/pages/api/levels/[id]/complete";
import { getAuthUser } from "@/lib/auth";
import * as levelService from "@/services/levelService";
import { makeReq, makeRes } from "../../../../helpers/apiHelpers";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/services/levelService", () => ({
  recordCompletion: vi.fn(),
}));

const mockUser = { id: "user-1" };
const levelId = "level-1";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(mockUser as any);
});

describe("POST /api/levels/:id/complete", () => {
  /** Rejects methods other than POST. */
  it("returns 405 for non-POST methods", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET", query: { id: levelId } }), res);
    expect(res._status).toBe(405);
  });

  /** Returns 401 when no auth token is provided. */
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ method: "POST", query: { id: levelId } }), res);
    expect(res._status).toBe(401);
  });

  /** Records the completion idempotently and returns 204 with no body. */
  it("returns 204 and records the completion", async () => {
    vi.mocked(levelService.recordCompletion).mockResolvedValue(undefined as any);
    const res = makeRes();
    await handler(makeReq({ method: "POST", query: { id: levelId } }), res);
    expect(res._status).toBe(204);
    expect(levelService.recordCompletion).toHaveBeenCalledWith(levelId, mockUser.id);
  });
});
