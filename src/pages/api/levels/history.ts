import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import * as levelService from "@/services/levelService";

/**
 * Returns all levels the authenticated user has completed, including ghost levels
 * (soft-deleted published levels flagged by deletedAt). Used by the History tab
 * in the main menu.
 *
 * Handles: GET /api/levels/history
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const user = await getAuthUser(req);
    if (!user) throw new UnauthorizedError();

    const levels = await levelService.getCompletionHistory(user.id);
    return res.status(200).json({ levels });
  } catch (err) {
    handleError(err, res);
  }
}
