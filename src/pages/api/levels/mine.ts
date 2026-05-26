import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import * as levelService from "@/services/levelService";

/**
 * Returns all levels owned by the authenticated user — both drafts and published —
 * excluding deleted ones. Used by the My Levels tab in the main menu.
 *
 * Handles: GET /api/levels/mine
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const user = await getAuthUser(req);
    if (!user) throw new UnauthorizedError();

    const levels = await levelService.listMyLevels(user.id);
    return res.status(200).json({ levels });
  } catch (err) {
    handleError(err, res);
  }
}
