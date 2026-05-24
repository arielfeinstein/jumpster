import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import * as levelService from "@/services/levelService";

// Handles: GET /api/levels/:id, PATCH /api/levels/:id
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query as { id: string };

  try {
    const user = await getAuthUser(req);
    if (!user) throw new UnauthorizedError();

    if (req.method === "GET") {
      const level = await levelService.getLevel(id, user.id);
      return res.status(200).json({ level });
    }

    if (req.method === "PATCH") {
      const { title, data } = req.body;
      const level = await levelService.updateLevel(id, user.id, { title, data });
      return res.status(200).json({ level });
    }

    return res.status(405).end();
  } catch (err) {
    handleError(err, res);
  }
}
