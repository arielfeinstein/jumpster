import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { getMe } from "@/services/userService";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getMe ────────────────────────────────────────────────────────────────────

describe("getMe", () => {
  /** Returns username and email when the user exists. */
  it("returns the user profile", async () => {
    const mockUser = { username: "ariel", email: "ariel@example.com" };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const result = await getMe("user-1");

    expect(result).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { username: true, email: true },
    });
  });

  /** Throws NotFoundError when no matching user row exists. */
  it("throws NotFoundError when the user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(getMe("missing-id")).rejects.toThrow(NotFoundError);
  });
});
