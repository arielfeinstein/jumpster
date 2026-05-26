import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthUser } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/lib/errors';
import * as levelService from '@/services/levelService';

// Handles: POST /api/levels/:id/play
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { id } = req.query as { id: string };

    try {
        const user = await getAuthUser(req);
        if (!user) throw new UnauthorizedError();

        await levelService.recordPlay(id, user.id);
        return res.status(204).end();
    } catch (err) {
        handleError(err, res);
    }
}
