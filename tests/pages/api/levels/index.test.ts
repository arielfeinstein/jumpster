import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "@/pages/api/levels/index";
import { getAuthUser } from "@/lib/auth";
import * as levelService from "@/services/levelService";
import { makeReq, makeRes } from "../../../helpers/apiHelpers";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/services/levelService", () => ({
  listPublishedLevels: vi.fn(),
  createLevel: vi.fn(),
}));

const mockUser = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(mockUser as any);
});

// ─── GET /api/levels ──────────────────────────────────────────────────────────

describe("GET /api/levels", () => {
  /** Returns 401 when no auth token is provided. */
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }), res);
    expect(res._status).toBe(401);
  });

  /** Fetches and returns all published levels without server-side filtering. */
  it("returns 200 with the levels list", async () => {
    const levels = [{ id: "1" }, { id: "2" }];
    vi.mocked(levelService.listPublishedLevels).mockResolvedValue(levels as any);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }), res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ levels });
  });
});

// ─── POST /api/levels ─────────────────────────────────────────────────────────

describe("POST /api/levels", () => {
  /** Returns 401 when no auth token is provided. */
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: { title: "Level" } }), res);
    expect(res._status).toBe(401);
  });

  /** Returns 400 when the request body contains no title field. */
  it("returns 400 when title is missing", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }), res);
    expect(res._status).toBe(400);
  });

  /** Returns 400 when title is present but contains only whitespace. */
  it("returns 400 when title is blank whitespace", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: { title: "   " } }), res);
    expect(res._status).toBe(400);
  });

  /** Creates the level with the title trimmed and returns 201. */
  it("returns 201 with the new level and trims the title", async () => {
    const level = { id: "lvl-1", title: "My Level" };
    vi.mocked(levelService.createLevel).mockResolvedValue(level as any);
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: { title: "  My Level  " } }), res);
    expect(res._status).toBe(201);
    expect(res._body).toEqual({ level });
    expect(levelService.createLevel).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({ title: "My Level" })
    );
  });
});

// ─── Method guard ─────────────────────────────────────────────────────────────

describe("unsupported methods", () => {
  /** Rejects any method other than GET and POST. */
  it("returns 405 for PUT", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "PUT" }), res);
    expect(res._status).toBe(405);
  });
});
