import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import * as levelService from "@/services/levelService";

// Handles: GET /api/levels, POST /api/levels
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const user = await getAuthUser(req);
    if (!user) throw new UnauthorizedError();

    /**
     * Returns all published, non-deleted levels with author username and completion count.
     * No server-side filtering — search, sort, and difficulty filtering happen client-side.
     */
    if (req.method === "GET") {
      const levels = await levelService.listPublishedLevels(user.id);
      return res.status(200).json({ levels });
    }

    /** Creates a new draft level owned by the authenticated user. */
    if (req.method === "POST") {
      const { title, data } = req.body;
      if (!title || typeof title !== "string" || title.trim() === "") {
        throw new ValidationError("title is required");
      }

      const level = await levelService.createLevel(user.id, { title: title.trim(), data });
      return res.status(201).json({ level });
    }

    return res.status(405).end();
  } catch (err) {
    handleError(err, res);
  }
}
