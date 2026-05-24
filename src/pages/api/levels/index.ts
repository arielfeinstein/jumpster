import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import * as levelService from "@/services/levelService";

// Handles: POST /api/levels
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const user = await getAuthUser(req);
    if (!user) throw new UnauthorizedError();

    const { title, data } = req.body;
    if (!title || typeof title !== "string" || title.trim() === "") {
      throw new ValidationError("title is required");
    }

    const level = await levelService.createLevel(user.id, { title: title.trim(), data });
    return res.status(201).json({ level });
  } catch (err) {
    handleError(err, res);
  }
}
