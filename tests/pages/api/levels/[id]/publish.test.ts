import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "@/pages/api/levels/[id]/publish";
import { getAuthUser } from "@/lib/auth";
import * as levelService from "@/services/levelService";
import { ForbiddenError } from "@/lib/errors";
import { makeReq, makeRes } from "../../../../helpers/apiHelpers";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/services/levelService", () => ({
  publishLevel: vi.fn(),
}));

const mockUser = { id: "user-1" };
const levelId = "level-1";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(mockUser as any);
});

describe("POST /api/levels/:id/publish", () => {
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

  /** Publishes the level irreversibly and returns 204 with no body. */
  it("returns 204 after publishing the level", async () => {
    vi.mocked(levelService.publishLevel).mockResolvedValue(undefined as any);
    const res = makeRes();
    await handler(makeReq({ method: "POST", query: { id: levelId } }), res);
    expect(res._status).toBe(204);
    expect(levelService.publishLevel).toHaveBeenCalledWith(levelId, mockUser.id);
  });

  /** Returns 403 when the level is already published or the requester is not the author. */
  it("returns 403 when publish is forbidden", async () => {
    vi.mocked(levelService.publishLevel).mockRejectedValue(new ForbiddenError());
    const res = makeRes();
    await handler(makeReq({ method: "POST", query: { id: levelId } }), res);
    expect(res._status).toBe(403);
  });
});
