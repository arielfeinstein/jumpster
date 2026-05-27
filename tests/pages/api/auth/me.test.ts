import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "@/pages/api/auth/me";
import { getAuthUser } from "@/lib/auth";
import * as userService from "@/services/userService";
import { makeReq, makeRes } from "../../../helpers/apiHelpers";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/services/userService", () => ({ getMe: vi.fn() }));

const mockAuthUser = { id: "user-1" };
const mockUser = { username: "ariel", email: "ariel@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser as any);
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  /** Returns 401 when no auth token is provided. */
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }), res);
    expect(res._status).toBe(401);
  });

  /** Returns the user's username and email. */
  it("returns 200 with the user profile", async () => {
    vi.mocked(userService.getMe).mockResolvedValue(mockUser);
    const res = makeRes();
    await handler(makeReq({ method: "GET" }), res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual(mockUser);
    expect(userService.getMe).toHaveBeenCalledWith(mockAuthUser.id);
  });
});

// ─── Method guard ─────────────────────────────────────────────────────────────

describe("unsupported methods", () => {
  /** Rejects any method other than GET. */
  it("returns 405 for POST", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST" }), res);
    expect(res._status).toBe(405);
  });
});
