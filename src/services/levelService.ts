import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Difficulty } from "@/game/shared/types/Difficulty";

// Joins author username onto a level query result.
// Spread into any findMany/findUnique that needs these fields for display.
const levelWithMeta = {
  include: {
    author: { select: { username: true } },
  },
} as const;

// Select clause for list queries that need per-user play/completion/like stats.
// Uses select (not include) so only explicitly listed fields reach the caller —
// prevents leaking authorId, data, publishedAt, deletedAt over the wire.
export const levelWithStatsSelect = {
  select: {
    id:          true,
    title:       true,
    difficulty:  true,
    published:   true,
    createdAt:   true,
    author:      { select: { username: true } },
    playHistory: { select: { userId: true, playCount: true, completedAt: true } },
    likes:       { select: { userId: true } },
  },
} as const;

// Maps a raw DB row (with playHistory and likes) to the display shape consumed by the frontend.
// bookmarkedByMe defaults to false here; interactionService overrides it to true for bookmarked levels.
export function withStats<T extends {
  playHistory: Array<{ userId: string; playCount: number; completedAt: Date | null }>;
  likes: Array<{ userId: string }>;
}>(
  level: T,
  userId: string
) {
  const { playHistory, likes, ...rest } = level;
  return {
    ...rest,
    totalPlays:     playHistory.reduce((sum, h) => sum + h.playCount, 0),
    completedCount: playHistory.filter(h => h.completedAt !== null).length,
    playedByMe:     playHistory.some(h => h.userId === userId),
    completedByMe:  playHistory.some(h => h.userId === userId && h.completedAt !== null),
    likeCount:      likes.length,
    likedByMe:      likes.some(l => l.userId === userId),
    bookmarkedByMe: false,
  };
}

/**
 * Creates a new draft level owned by the given user.
 * Optionally persists the initial layout data so the first save is one round-trip.
 */
export async function createLevel(
  userId: string,
  input: { title: string; data?: unknown; difficulty?: Difficulty }
) {
  const createData: { title: string; authorId: string; data?: Prisma.InputJsonValue; difficulty?: string } = {
    title: input.title,
    authorId: userId,
  };
  if (input.data !== undefined)
    createData.data = input.data as Prisma.InputJsonValue;
  if (input.difficulty !== undefined)
    createData.difficulty = input.difficulty;

  return prisma.level.create({ data: createData });
}

/**
 * Fetches a level by ID.
 * Private levels are only visible to their author — other users get a 404
 * so the level's existence isn't leaked.
 */
export async function getLevel(id: string, userId: string) {
  const level = await prisma.level.findUnique({ where: { id } });

  if (!level) throw new NotFoundError();
  if (!level.published && level.authorId !== userId) throw new NotFoundError();

  return level;
}

/**
 * Records that a user has started playing a level.
 * Increments playCount and refreshes lastPlayed each call — one row per user-level pair.
 */
export async function recordPlay(levelId: string, userId: string) {
  await prisma.playHistory.upsert({
    where:  { userId_levelId: { userId, levelId } },
    create: { userId, levelId },
    update: { playCount: { increment: 1 }, lastPlayed: new Date() },
  });
}

/**
 * Records that a user has completed a level.
 * Idempotent — sets completedAt on each call (preserving the value is acceptable since
 * the key semantic is completedAt !== null, not the exact timestamp).
 */
export async function recordCompletion(levelId: string, userId: string) {
  await prisma.playHistory.upsert({
    where:  { userId_levelId: { userId, levelId } },
    create: { userId, levelId, completedAt: new Date() },
    update: { completedAt: new Date() },
  });
}

/**
 * Returns all published, non-deleted levels enriched with play/completion stats and
 * per-user flags. All filtering and sorting happens client-side.
 */
export async function listPublishedLevels(userId: string) {
  const levels = await prisma.level.findMany({
    where: { published: true, deletedAt: null },
    ...levelWithStatsSelect,
  });
  return levels.map(l => withStats(l, userId));
}

/**
 * Returns all levels owned by the given user, excluding deleted ones.
 * Includes both drafts and published levels so the frontend can render
 * DRAFT/PUBLISHED badges and show the correct action buttons.
 */
export async function listMyLevels(userId: string) {
  const levels = await prisma.level.findMany({
    where: { authorId: userId, deletedAt: null },
    ...levelWithStatsSelect,
  });
  return levels.map(l => withStats(l, userId));
}

/**
 * Deletes a level. Routes to hard or soft delete based on published state:
 * - Unpublished → permanently removed from the database.
 * - Published   → soft delete: data nulled, deletedAt stamped (ghost level).
 * See the delete strategy comment in schema.prisma for ghost-level behavior per caller.
 */
export async function deleteLevel(id: string, userId: string) {
  const level = await prisma.level.findUnique({ where: { id } });

  if (!level) throw new NotFoundError("Level not found");
  if (level.authorId !== userId) throw new ForbiddenError("Only the author can delete this level");

  if (!level.published) {
    return prisma.level.delete({ where: { id } });
  }
  return prisma.level.update({
    where: { id },
    data: { data: Prisma.DbNull, deletedAt: new Date() },
  });
}

/**
 * Publishes a draft level. Author-only and irreversible — a published level
 * cannot be unpublished or edited.
 */
export async function publishLevel(levelId: string, userId: string) {
  const level = await prisma.level.findUnique({ where: { id: levelId } });

  if (!level) throw new NotFoundError("Level not found");
  if (level.authorId !== userId) throw new ForbiddenError("Only the author can publish this level");
  if (level.published) throw new ForbiddenError("Level is already published");
  if (level.deletedAt !== null) throw new ForbiddenError("Cannot publish a deleted level");

  return prisma.level.update({
    where: { id: levelId },
    data: { published: true, publishedAt: new Date() },
  });
}

/**
 * Returns all levels the user has completed, including ghost levels (soft-deleted published
 * levels). Ghost levels have deletedAt set — the frontend grays them out as "no longer available."
 */
export async function getCompletionHistory(userId: string) {
  const records = await prisma.playHistory.findMany({
    where:   { userId, completedAt: { not: null } },
    include: { level: { ...levelWithMeta } },
  });
  return records.map(r => r.level);
}

/**
 * Updates a draft level's title and/or layout data.
 * Only the author may edit, and only while the level is unpublished and not deleted.
 */
export async function updateLevel(
  id: string,
  userId: string,
  patch: { title?: string; data?: unknown; difficulty?: Difficulty }
) {
  const level = await prisma.level.findUnique({ where: { id } });

  if (!level) throw new NotFoundError();
  if (level.authorId !== userId) throw new ForbiddenError();
  if (level.published) throw new ForbiddenError("Cannot edit a published level");
  if (level.deletedAt !== null) throw new ForbiddenError("Cannot edit a deleted level");

  const updateData: { title?: string; data?: Prisma.InputJsonValue; difficulty?: string } = {};
  if (patch.title !== undefined) updateData.title = patch.title;
  if (patch.data !== undefined)
    updateData.data = patch.data as Prisma.InputJsonValue;
  if (patch.difficulty !== undefined)
    updateData.difficulty = patch.difficulty;

  return prisma.level.update({ where: { id }, data: updateData });
}
