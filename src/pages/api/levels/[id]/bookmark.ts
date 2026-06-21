import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthUser } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/lib/errors';
import * as interactionService from '@/services/interactionService';

// Handles: POST /api/levels/:id/bookmark
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { id } = req.query as { id: string };

    try {
        const user = await getAuthUser(req);
        if (!user) throw new UnauthorizedError();

        const { bookmarked } = await interactionService.toggleBookmark(id, user.id);
        return res.status(200).json({ bookmarked });
    } catch (err) {
        handleError(err, res);
    }
}
