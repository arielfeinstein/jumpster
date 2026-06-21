import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError } from "@/lib/errors";
import type { Level } from "@prisma/client";

// Replace the real Prisma client with a lightweight mock before any test runs.
// This keeps tests fast and database-free.
vi.mock("@/lib/db", () => ({
  prisma: {
    level: { findUnique: vi.fn() },
    like: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    bookmark: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}));

// Import after vi.mock so we get the mocked version.
import { prisma } from "@/lib/db";
import { toggleLike, toggleBookmark, listBookmarkedLevels } from "@/services/interactionService";

// Builds a realistic Level object with sensible defaults.
// Pass overrides to test specific states (e.g. published: true).
function makeLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: "level-1",
    title: "Test Level",
    difficulty: "medium",
    data: null,
    authorId: "user-1",
    createdAt: new Date(),
    published: false,
    publishedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

// Builds a level as returned by queries that spread levelWithStatsSelect —
// includes author username, playHistory, and likes arrays ready for withStats mapping.
function makeLevelWithStats(overrides: Partial<Level> = {}) {
  return {
    ...makeLevel(overrides),
    author: { username: "testuser" },
    playHistory: [] as Array<{ userId: string; playCount: number; completedAt: Date | null }>,
    likes: [] as Array<{ userId: string }>,
  };
}

// Builds a Bookmark row as returned by prisma.bookmark.findMany with the nested
// level relation included.
function makeBookmark(levelOverrides: Partial<Level> = {}) {
  const level = makeLevelWithStats({ published: true, ...levelOverrides });
  return {
    id: "bookmark-1",
    userId: "user-1",
    levelId: level.id,
    createdAt: new Date(),
    level,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── toggleLike ──────────────────────────────────────────────────────────────

describe("toggleLike", () => {
  it("throws NotFoundError when level does not exist", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(null);

    await expect(toggleLike("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when level is not published", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ published: false })
    );

    await expect(toggleLike("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when level is soft-deleted", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ published: true, deletedAt: new Date() })
    );

    await expect(toggleLike("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("creates a Like and returns { liked: true } when no prior Like exists", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ published: true })
    );
    vi.mocked((prisma as any).like.findUnique).mockResolvedValue(null);
    vi.mocked((prisma as any).like.create).mockResolvedValue({});

    const result = await toggleLike("level-1", "user-1");

    expect(result).toEqual({ liked: true });
    expect((prisma as any).like.create).toHaveBeenCalledWith({
      data: { userId: "user-1", levelId: "level-1" },
    });
    expect((prisma as any).like.delete).not.toHaveBeenCalled();
  });

  it("deletes the Like and returns { liked: false } when a Like already exists", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ published: true })
    );
    vi.mocked((prisma as any).like.findUnique).mockResolvedValue({
      userId: "user-1",
      levelId: "level-1",
    });
    vi.mocked((prisma as any).like.delete).mockResolvedValue({});

    const result = await toggleLike("level-1", "user-1");

    expect(result).toEqual({ liked: false });
    expect((prisma as any).like.delete).toHaveBeenCalledWith({
      where: { userId_levelId: { userId: "user-1", levelId: "level-1" } },
    });
    expect((prisma as any).like.create).not.toHaveBeenCalled();
  });
});

// ─── toggleBookmark ──────────────────────────────────────────────────────────

describe("toggleBookmark", () => {
  it("throws NotFoundError when level does not exist", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(null);

    await expect(toggleBookmark("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when level is not published", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ published: false })
    );

    await expect(toggleBookmark("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("creates a Bookmark and returns { bookmarked: true } when none exists", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ published: true })
    );
    vi.mocked((prisma as any).bookmark.findUnique).mockResolvedValue(null);
    vi.mocked((prisma as any).bookmark.create).mockResolvedValue({});

    const result = await toggleBookmark("level-1", "user-1");

    expect(result).toEqual({ bookmarked: true });
    expect((prisma as any).bookmark.create).toHaveBeenCalledWith({
      data: { userId: "user-1", levelId: "level-1" },
    });
    expect((prisma as any).bookmark.delete).not.toHaveBeenCalled();
  });

  it("deletes the Bookmark and returns { bookmarked: false } when one already exists", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ published: true })
    );
    vi.mocked((prisma as any).bookmark.findUnique).mockResolvedValue({
      userId: "user-1",
      levelId: "level-1",
    });
    vi.mocked((prisma as any).bookmark.delete).mockResolvedValue({});

    const result = await toggleBookmark("level-1", "user-1");

    expect(result).toEqual({ bookmarked: false });
    expect((prisma as any).bookmark.delete).toHaveBeenCalledWith({
      where: { userId_levelId: { userId: "user-1", levelId: "level-1" } },
    });
    expect((prisma as any).bookmark.create).not.toHaveBeenCalled();
  });
});

// ─── listBookmarkedLevels ────────────────────────────────────────────────────

describe("listBookmarkedLevels", () => {
  it("returns an empty array when user has no bookmarks", async () => {
    vi.mocked((prisma as any).bookmark.findMany).mockResolvedValue([]);

    const result = await listBookmarkedLevels("user-1");

    expect(result).toEqual([]);
  });

  it("maps each bookmark to its level with correct stats (likeCount, likedByMe, playedByMe, completedByMe, bookmarkedByMe always true)", async () => {
    const bookmark = makeBookmark();
    // Set up a level with some play and like history so we can verify the mapping.
    bookmark.level.playHistory = [
      { userId: "user-1", playCount: 2, completedAt: new Date() },
      { userId: "user-2", playCount: 1, completedAt: null },
    ];
    bookmark.level.likes = [{ userId: "user-1" }, { userId: "user-2" }];
    vi.mocked((prisma as any).bookmark.findMany).mockResolvedValue([bookmark]);

    const [result] = await listBookmarkedLevels("user-1");

    expect(result.totalPlays).toBe(3);
    expect(result.completedCount).toBe(1);
    expect(result.playedByMe).toBe(true);
    expect(result.completedByMe).toBe(true);
    expect(result.likeCount).toBe(2);
    expect(result.likedByMe).toBe(true);
    // bookmarkedByMe must be true for every level returned by this function.
    expect(result.bookmarkedByMe).toBe(true);
  });

  it("includes ghost (soft-deleted) levels", async () => {
    const ghostBookmark = makeBookmark({ deletedAt: new Date() });
    vi.mocked((prisma as any).bookmark.findMany).mockResolvedValue([ghostBookmark]);

    const [result] = await listBookmarkedLevels("user-1");

    // The level should still come through — the frontend is responsible for
    // graying it out. Only check bookmarkedByMe to confirm mapping ran.
    expect(result.bookmarkedByMe).toBe(true);
    expect(result.id).toBe(ghostBookmark.level.id);
  });
});
