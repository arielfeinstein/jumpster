import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// Joins author username and completion count onto a level query result.
// Spread into any findMany/findUnique that needs these fields for display.
const levelWithMeta = {
  include: {
    author: { select: { username: true } },
    _count: { select: { completions: true } },
  },
} as const;

/**
 * Creates a new draft level owned by the given user.
 * Optionally persists the initial layout data so the first save is one round-trip.
 */
export async function createLevel(
  userId: string,
  input: { title: string; data?: unknown }
) {
  const createData: { title: string; authorId: string; data?: Prisma.InputJsonValue } = {
    title: input.title,
    authorId: userId,
  };
  if (input.data !== undefined)
    createData.data = input.data as Prisma.InputJsonValue;

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
 * Records that a user has completed a level.
 * Idempotent — completing the same level twice leaves exactly one Completion row.
 */
export async function recordCompletion(levelId: string, userId: string) {
  return prisma.completion.upsert({
    where: { userId_levelId: { userId, levelId } },
    create: { userId, levelId },
    update: {},
  });
}

/**
 * Returns all published, non-deleted levels with author username and completion count.
 * No server-side filtering — search, sort, and difficulty filtering happen client-side.
 */
export async function listPublishedLevels() {
  return prisma.level.findMany({
    where: { published: true, deletedAt: null },
    ...levelWithMeta,
  });
}

/**
 * Returns all levels owned by the given user, excluding deleted ones.
 * Includes both drafts and published levels so the frontend can render
 * DRAFT/PUBLISHED badges and show the correct action buttons.
 */
export async function listMyLevels(userId: string) {
  return prisma.level.findMany({
    where: { authorId: userId, deletedAt: null },
    ...levelWithMeta,
  });
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
    data: { data: null, deletedAt: new Date() },
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
  const completions = await prisma.completion.findMany({
    where: { userId },
    include: {
      level: { ...levelWithMeta },
    },
  });
  return completions.map((c) => c.level);
}

/**
 * Updates a draft level's title and/or layout data.
 * Only the author may edit, and only while the level is unpublished and not deleted.
 */
export async function updateLevel(
  id: string,
  userId: string,
  patch: { title?: string; data?: unknown }
) {
  const level = await prisma.level.findUnique({ where: { id } });

  if (!level) throw new NotFoundError();
  if (level.authorId !== userId) throw new ForbiddenError();
  if (level.published) throw new ForbiddenError("Cannot edit a published level");
  if (level.deletedAt !== null) throw new ForbiddenError("Cannot edit a deleted level");

  const updateData: { title?: string; data?: Prisma.InputJsonValue } = {};
  if (patch.title !== undefined) updateData.title = patch.title;
  if (patch.data !== undefined)
    updateData.data = patch.data as Prisma.InputJsonValue;

  return prisma.level.update({ where: { id }, data: updateData });
}
