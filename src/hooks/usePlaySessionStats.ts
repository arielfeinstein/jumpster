import { useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { EventBusRegistry } from '../game/shared/registry/EventRegistry';

/**
 * Listens for play-session-ended and records the completion in the DB.
 * Must be called from a component that outlives the Play scene (e.g. PhaserGame).
 * The API call result is logged but does not block the scene transition.
 */
export function usePlaySessionStats() {
    useEffect(() => {
        const handler = async ({ levelId }: EventBusRegistry['play-session-ended']) => {
            try {
                const res = await fetch(`/api/levels/${levelId}/complete`, { method: 'POST' });
                if (!res.ok) console.error('[usePlaySessionStats] failed:', res.status);
                else console.log('[usePlaySessionStats] completion recorded for', levelId);
            } catch (err) {
                console.error('[usePlaySessionStats] network error:', err);
            }
        };

        EventBus.on('play-session-ended', handler);
        return () => { EventBus.off('play-session-ended', handler); };
    }, []);
}
