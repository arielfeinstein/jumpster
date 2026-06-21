import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import * as interactionService from "@/services/interactionService";

/**
 * Returns all levels the authenticated user has bookmarked, including ghost levels
 * (soft-deleted published levels flagged by deletedAt). Used by the Bookmarks tab
 * in the main menu.
 *
 * Handles: GET /api/levels/bookmarks
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const user = await getAuthUser(req);
    if (!user) throw new UnauthorizedError();

    const levels = await interactionService.listBookmarkedLevels(user.id);
    return res.status(200).json({ levels });
  } catch (err) {
    handleError(err, res);
  }
}
