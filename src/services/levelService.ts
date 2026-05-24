import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

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
