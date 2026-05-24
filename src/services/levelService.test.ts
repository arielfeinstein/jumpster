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
      update: vi.fn(),
    },
  },
}));

// Import after vi.mock so we get the mocked version.
import { prisma } from "@/lib/db";
import { createLevel, getLevel, updateLevel } from "./levelService";

// Builds a realistic Level object with sensible defaults.
// Pass overrides to test specific states (e.g. published: true).
function makeLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: "level-1",
    title: "Test Level",
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
