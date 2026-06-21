/**
 * interactionService — user interactions that are orthogonal to level authorship.
 *
 * Handles likes and bookmarks: two social features that sit on top of published
 * levels without touching level content or play-history tracking.  Both features
 * share the same "level must be published" guard (`requirePublishedLevel`) and
 * follow a simple toggle pattern — a second call undoes the first.
 *
 * All stat enrichment (likeCount, likedByMe, etc.) reuses the `withStats` helper
 * exported from levelService so the response shape stays consistent across every
 * list endpoint.
 */

import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { levelWithStatsSelect, withStats } from "@/services/levelService";

/**
 * Guards that a level exists and is published (not a draft or ghost).
 * Both toggleLike and toggleBookmark require a live published level.
 * Throws NotFoundError so callers don't have to repeat this check.
 */
async function requirePublishedLevel(levelId: string) {
  const level = await prisma.level.findUnique({ where: { id: levelId } });
  if (!level || !level.published || level.deletedAt !== null) {
    throw new NotFoundError("Level not found");
  }
  return level;
}

/**
 * Toggles a Like for the given user on the given level.
 * - If the user has already liked the level the Like row is deleted (unlike).
 * - If not, a Like row is created.
 * Returns the resulting liked state.
 *
 * Throws NotFoundError if the level does not exist or is not published.
 */
export async function toggleLike(
  levelId: string,
  userId: string
): Promise<{ liked: boolean }> {
  await requirePublishedLevel(levelId);

  const existing = await prisma.like.findUnique({
    where: { userId_levelId: { userId, levelId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { userId_levelId: { userId, levelId } } });
    return { liked: false };
  }

  await prisma.like.create({ data: { userId, levelId } });
  return { liked: true };
}

/**
 * Toggles a Bookmark for the given user on the given level.
 * - If already bookmarked the Bookmark row is deleted (remove from list).
 * - If not, a Bookmark row is created.
 * Returns the resulting bookmarked state.
 *
 * Throws NotFoundError if the level does not exist or is not published.
 */
export async function toggleBookmark(
  levelId: string,
  userId: string
): Promise<{ bookmarked: boolean }> {
  await requirePublishedLevel(levelId);

  const existing = await prisma.bookmark.findUnique({
    where: { userId_levelId: { userId, levelId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { userId_levelId: { userId, levelId } } });
    return { bookmarked: false };
  }

  await prisma.bookmark.create({ data: { userId, levelId } });
  return { bookmarked: true };
}

/**
 * Returns all levels the user has bookmarked, enriched with play/completion/like
 * stats in the same shape as listPublishedLevels. Ghost (soft-deleted) levels are
 * included so the frontend can gray them out — the schema comment documents this
 * "include ghost" behavior for bookmarks/history.
 *
 * bookmarkedByMe is always set to true because every level here came from the
 * user's bookmark list.
 */
export async function listBookmarkedLevels(userId: string) {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      level: {
        ...levelWithStatsSelect,
      },
    },
  });

  return bookmarks.map(b => ({
    ...withStats(b.level, userId),
    bookmarkedByMe: true as const,
  }));
}
