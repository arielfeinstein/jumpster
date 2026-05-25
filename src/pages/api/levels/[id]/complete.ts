import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@/lib/errors';
import * as levelService from '@/services/levelService';

// Handles: POST /api/levels/:id/complete
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { id } = req.query as { id: string };

    try {
        // TODO: require auth and pass userId to recordCompletion once per-user completion tracking is added
        await levelService.recordCompletion(id);
        return res.status(204).end();
    } catch (err) {
        handleError(err, res);
    }
}
