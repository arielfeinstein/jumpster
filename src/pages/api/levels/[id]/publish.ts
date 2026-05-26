import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import * as levelService from "@/services/levelService";

/**
 * Publishes a draft level. Author-only and irreversible — once published,
 * a level cannot be unpublished or edited.
 *
 * Handles: POST /api/levels/:id/publish
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query as { id: string };

  try {
    const user = await getAuthUser(req);
    if (!user) throw new UnauthorizedError();

    await levelService.publishLevel(id, user.id);
    return res.status(204).end();
  } catch (err) {
    handleError(err, res);
  }
}
