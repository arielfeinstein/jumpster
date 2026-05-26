import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Level } from "@prisma/client";

// Replace the real Prisma client with a lightweight mock before any test runs.
// This keeps tests fast and database-free.
vi.mock("@/lib/db", () => ({
  prisma: {
    level: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    completion: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Import after vi.mock so we get the mocked version.
import { prisma } from "@/lib/db";
import {
  createLevel, getLevel, recordCompletion, updateLevel,
  listPublishedLevels, listMyLevels, deleteLevel, publishLevel,
  getCompletionHistory,
} from "@/services/levelService";

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
    views: 0,
    published: false,
    publishedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

// Builds a level as returned by queries that spread levelWithMeta —
// includes the joined author username and aggregated completion count.
function makeLevelWithMeta(overrides: Partial<Level> = {}) {
  return {
    ...makeLevel(overrides),
    author: { username: "testuser" },
    _count: { completions: 0 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createLevel ────────────────────────────────────────────────────────────

describe("createLevel", () => {
  it("creates and returns a new level without data", async () => {
    const expected = makeLevel({ title: "My Level" });
    vi.mocked(prisma.level.create).mockResolvedValue(expected);

    const result = await createLevel("user-1", { title: "My Level" });

    expect(result).toEqual(expected);
    expect(prisma.level.create).toHaveBeenCalledWith({
      data: { title: "My Level", authorId: "user-1" },
    });
  });

  it("includes layout data when provided", async () => {
    const layoutData = { version: 1, name: "My Level", entities: [] };
    const expected = makeLevel({ title: "My Level", data: layoutData });
    vi.mocked(prisma.level.create).mockResolvedValue(expected);

    await createLevel("user-1", { title: "My Level", data: layoutData });

    expect(prisma.level.create).toHaveBeenCalledWith({
      data: { title: "My Level", authorId: "user-1", data: layoutData },
    });
  });
});

// ─── getLevel ───────────────────────────────────────────────────────────────

describe("getLevel", () => {
  it("throws NotFoundError when level does not exist", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(null);

    await expect(getLevel("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when level is private and requester is not the author", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ published: false, authorId: "user-2" })
    );

    await expect(getLevel("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("returns a published level to any authenticated user", async () => {
    const level = makeLevel({ published: true, authorId: "user-2" });
    vi.mocked(prisma.level.findUnique).mockResolvedValue(level);

    const result = await getLevel("level-1", "user-1");

    expect(result).toEqual(level);
  });

  it("returns a private level to its own author", async () => {
    const level = makeLevel({ published: false, authorId: "user-1" });
    vi.mocked(prisma.level.findUnique).mockResolvedValue(level);

    const result = await getLevel("level-1", "user-1");

    expect(result).toEqual(level);
  });
});

// ─── updateLevel ────────────────────────────────────────────────────────────

describe("updateLevel", () => {
  it("throws NotFoundError when level does not exist", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(null);

    await expect(updateLevel("level-1", "user-1", {})).rejects.toThrow(
      NotFoundError
    );
  });

  it("throws ForbiddenError when requester is not the author", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-2" })
    );

    await expect(updateLevel("level-1", "user-1", {})).rejects.toThrow(
      ForbiddenError
    );
  });

  it("throws ForbiddenError when level is already published", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-1", published: true })
    );

    await expect(updateLevel("level-1", "user-1", {})).rejects.toThrow(
      ForbiddenError
    );
  });

  it("throws ForbiddenError when level has been deleted", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-1", deletedAt: new Date() })
    );

    await expect(updateLevel("level-1", "user-1", {})).rejects.toThrow(
      ForbiddenError
    );
  });

  it("applies the patch and returns the updated level", async () => {
    const existing = makeLevel({ authorId: "user-1" });
    const updated = makeLevel({ authorId: "user-1", title: "Updated Title" });
    vi.mocked(prisma.level.findUnique).mockResolvedValue(existing);
    vi.mocked(prisma.level.update).mockResolvedValue(updated);

    const result = await updateLevel("level-1", "user-1", {
      title: "Updated Title",
    });

    expect(result).toEqual(updated);
    expect(prisma.level.update).toHaveBeenCalledWith({
      where: { id: "level-1" },
      data: { title: "Updated Title" },
    });
  });
});

// ─── recordCompletion ────────────────────────────────────────────────────────

describe("recordCompletion", () => {
  it("upserts a Completion row with the correct userId and levelId", async () => {
    vi.mocked(prisma.completion.upsert).mockResolvedValue({
      userId: "user-1",
      levelId: "level-1",
      completedAt: new Date(),
    });

    await recordCompletion("level-1", "user-1");

    expect(prisma.completion.upsert).toHaveBeenCalledWith({
      where: { userId_levelId: { userId: "user-1", levelId: "level-1" } },
      create: { userId: "user-1", levelId: "level-1" },
      update: {},
    });
  });

  it("is idempotent — completing the same level twice issues the same upsert", async () => {
    const row = { userId: "user-1", levelId: "level-1", completedAt: new Date() };
    vi.mocked(prisma.completion.upsert).mockResolvedValue(row);

    await recordCompletion("level-1", "user-1");
    await recordCompletion("level-1", "user-1");

    expect(prisma.completion.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.completion.upsert).toHaveBeenNthCalledWith(2, {
      where: { userId_levelId: { userId: "user-1", levelId: "level-1" } },
      create: { userId: "user-1", levelId: "level-1" },
      update: {},
    });
  });
});

// ─── listPublishedLevels ─────────────────────────────────────────────────────

describe("listPublishedLevels", () => {
  it("returns whatever findMany resolves with", async () => {
    const levels = [makeLevelWithMeta(), makeLevelWithMeta({ id: "level-2" })];
    vi.mocked(prisma.level.findMany).mockResolvedValue(levels as any);

    const result = await listPublishedLevels();

    expect(result).toEqual(levels);
  });

  it("queries only published, non-deleted levels", async () => {
    vi.mocked(prisma.level.findMany).mockResolvedValue([]);

    await listPublishedLevels();

    expect(prisma.level.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true, deletedAt: null } })
    );
  });
});

// ─── listMyLevels ────────────────────────────────────────────────────────────

describe("listMyLevels", () => {
  it("returns the user's levels", async () => {
    const levels = [makeLevelWithMeta()];
    vi.mocked(prisma.level.findMany).mockResolvedValue(levels as any);

    const result = await listMyLevels("user-1");

    expect(result).toEqual(levels);
  });

  it("queries only the given user's non-deleted levels", async () => {
    vi.mocked(prisma.level.findMany).mockResolvedValue([]);

    await listMyLevels("user-1");

    expect(prisma.level.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { authorId: "user-1", deletedAt: null } })
    );
  });
});

// ─── deleteLevel ─────────────────────────────────────────────────────────────

describe("deleteLevel", () => {
  it("throws NotFoundError when level does not exist", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(null);

    await expect(deleteLevel("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when requester is not the author", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-2" })
    );

    await expect(deleteLevel("level-1", "user-1")).rejects.toThrow(ForbiddenError);
  });

  it("hard-deletes an unpublished level", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-1", published: false })
    );
    vi.mocked(prisma.level.delete).mockResolvedValue(makeLevel());

    await deleteLevel("level-1", "user-1");

    expect(prisma.level.delete).toHaveBeenCalledWith({ where: { id: "level-1" } });
    expect(prisma.level.update).not.toHaveBeenCalled();
  });

  it("soft-deletes a published level by nulling data and stamping deletedAt", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-1", published: true })
    );
    vi.mocked(prisma.level.update).mockResolvedValue(makeLevel());

    await deleteLevel("level-1", "user-1");

    expect(prisma.level.update).toHaveBeenCalledWith({
      where: { id: "level-1" },
      data: expect.objectContaining({ data: null, deletedAt: expect.any(Date) }),
    });
    expect(prisma.level.delete).not.toHaveBeenCalled();
  });
});

// ─── publishLevel ────────────────────────────────────────────────────────────

describe("publishLevel", () => {
  it("throws NotFoundError when level does not exist", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(null);

    await expect(publishLevel("level-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when requester is not the author", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-2" })
    );

    await expect(publishLevel("level-1", "user-1")).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when level is already published", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-1", published: true })
    );

    await expect(publishLevel("level-1", "user-1")).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when level has been deleted", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(
      makeLevel({ authorId: "user-1", deletedAt: new Date() })
    );

    await expect(publishLevel("level-1", "user-1")).rejects.toThrow(ForbiddenError);
  });

  it("sets published and publishedAt on a valid draft", async () => {
    vi.mocked(prisma.level.findUnique).mockResolvedValue(makeLevel({ authorId: "user-1" }));
    vi.mocked(prisma.level.update).mockResolvedValue(
      makeLevel({ authorId: "user-1", published: true, publishedAt: new Date() })
    );

    await publishLevel("level-1", "user-1");

    expect(prisma.level.update).toHaveBeenCalledWith({
      where: { id: "level-1" },
      data: expect.objectContaining({ published: true, publishedAt: expect.any(Date) }),
    });
  });
});

// ─── getCompletionHistory ────────────────────────────────────────────────────

describe("getCompletionHistory", () => {
  it("queries completions for the given user", async () => {
    vi.mocked(prisma.completion.findMany).mockResolvedValue([]);

    await getCompletionHistory("user-1");

    expect(prisma.completion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
  });

  it("maps completion rows to their nested level objects", async () => {
    const level = makeLevelWithMeta();
    vi.mocked(prisma.completion.findMany).mockResolvedValue([
      { userId: "user-1", levelId: "level-1", completedAt: new Date(), level } as any,
    ]);

    const result = await getCompletionHistory("user-1");

    expect(result).toEqual([level]);
  });

  it("includes ghost levels (those with deletedAt set)", async () => {
    const ghostLevel = makeLevelWithMeta({ deletedAt: new Date() });
    vi.mocked(prisma.completion.findMany).mockResolvedValue([
      { userId: "user-1", levelId: "level-1", completedAt: new Date(), level: ghostLevel } as any,
    ]);

    const result = await getCompletionHistory("user-1");

    expect(result[0].deletedAt).toBeInstanceOf(Date);
  });
});
