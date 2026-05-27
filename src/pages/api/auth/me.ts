import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import * as userService from "@/services/userService";

/**
 * GET /api/auth/me
 * Returns the username and email of the currently authenticated user.
 * Called once by UserProvider on login — not intended for repeated polling.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") return res.status(405).end();

    const authUser = await getAuthUser(req);
    if (!authUser) throw new UnauthorizedError();

    const user = await userService.getMe(authUser.id);
    return res.status(200).json(user);
  } catch (err) {
    handleError(err, res);
  }
}
