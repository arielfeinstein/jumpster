import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "@/pages/api/levels/[id]";
import { getAuthUser } from "@/lib/auth";
import * as levelService from "@/services/levelService";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { makeReq, makeRes } from "../../../helpers/apiHelpers";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/services/levelService", () => ({
  getLevel: vi.fn(),
  updateLevel: vi.fn(),
  deleteLevel: vi.fn(),
}));

const mockUser = { id: "user-1" };
const levelId = "level-1";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(mockUser as any);
});

// ─── GET /api/levels/:id ──────────────────────────────────────────────────────

describe("GET /api/levels/:id", () => {
  /** Returns 401 when no auth token is provided. */
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ method: "GET", query: { id: levelId } }), res);
    expect(res._status).toBe(401);
  });

  /** Returns the level data for the given ID. */
  it("returns 200 with the level", async () => {
    const level = { id: levelId, title: "My Level" };
    vi.mocked(levelService.getLevel).mockResolvedValue(level as any);
    const res = makeRes();
    await handler(makeReq({ method: "GET", query: { id: levelId } }), res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ level });
    expect(levelService.getLevel).toHaveBeenCalledWith(levelId, mockUser.id);
  });

  /** Returns 404 when the level doesn't exist or is private to another user. */
  it("returns 404 when the level is not found", async () => {
    vi.mocked(levelService.getLevel).mockRejectedValue(new NotFoundError());
    const res = makeRes();
    await handler(makeReq({ method: "GET", query: { id: levelId } }), res);
    expect(res._status).toBe(404);
  });
});

// ─── PATCH /api/levels/:id ────────────────────────────────────────────────────

describe("PATCH /api/levels/:id", () => {
  /** Returns 200 with the updated level after applying the patch. */
  it("returns 200 with the updated level", async () => {
    const level = { id: levelId, title: "Updated" };
    vi.mocked(levelService.updateLevel).mockResolvedValue(level as any);
    const res = makeRes();
    await handler(makeReq({ method: "PATCH", query: { id: levelId }, body: { title: "Updated" } }), res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ level });
    expect(levelService.updateLevel).toHaveBeenCalledWith(
      levelId, mockUser.id, { title: "Updated", data: undefined }
    );
  });

  /** Returns 403 when the requester is not the author or the level is already published. */
  it("returns 403 when the update is forbidden", async () => {
    vi.mocked(levelService.updateLevel).mockRejectedValue(new ForbiddenError());
    const res = makeRes();
    await handler(makeReq({ method: "PATCH", query: { id: levelId }, body: {} }), res);
    expect(res._status).toBe(403);
  });
});

// ─── DELETE /api/levels/:id ───────────────────────────────────────────────────

describe("DELETE /api/levels/:id", () => {
  /** Hard-deletes unpublished levels or soft-deletes published ones, returns 204. */
  it("returns 204 after deleting the level", async () => {
    vi.mocked(levelService.deleteLevel).mockResolvedValue(undefined as any);
    const res = makeRes();
    await handler(makeReq({ method: "DELETE", query: { id: levelId } }), res);
    expect(res._status).toBe(204);
    expect(levelService.deleteLevel).toHaveBeenCalledWith(levelId, mockUser.id);
  });

  /** Returns 403 when the requester is not the level's author. */
  it("returns 403 when deletion is forbidden", async () => {
    vi.mocked(levelService.deleteLevel).mockRejectedValue(new ForbiddenError());
    const res = makeRes();
    await handler(makeReq({ method: "DELETE", query: { id: levelId } }), res);
    expect(res._status).toBe(403);
  });
});

// ─── Method guard ─────────────────────────────────────────────────────────────

describe("unsupported methods", () => {
  /** Rejects any method other than GET, PATCH, and DELETE. */
  it("returns 405 for PUT", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "PUT", query: { id: levelId } }), res);
    expect(res._status).toBe(405);
  });
});
