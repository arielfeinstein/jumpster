import { useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { EventBusRegistry } from '../game/shared/registry/EventRegistry';

/**
 * Listens for play session lifecycle events and records them in the DB.
 * - play-ready         → POST /api/levels/:id/play    (records a play, fires on level load)
 * - play-session-ended → POST /api/levels/:id/complete (records a completion)
 * Must be called from a component that outlives the Play scene (e.g. PhaserGame).
 * API call results are logged but do not block scene transitions.
 */
export function usePlaySessionStats() {
    useEffect(() => {
        const onReady = async ({ levelId }: EventBusRegistry['play-ready']) => {
            try {
                const res = await fetch(`/api/levels/${levelId}/play`, { method: 'POST' });
                if (!res.ok) console.error('[usePlaySessionStats] play record failed:', res.status);
                else console.log('[usePlaySessionStats] play recorded for', levelId);
            } catch (err) {
                console.error('[usePlaySessionStats] network error:', err);
            }
        };

        const onEnded = async ({ levelId }: EventBusRegistry['play-session-ended']) => {
            try {
                const res = await fetch(`/api/levels/${levelId}/complete`, { method: 'POST' });
                if (!res.ok) console.error('[usePlaySessionStats] failed:', res.status);
                else console.log('[usePlaySessionStats] completion recorded for', levelId);
            } catch (err) {
                console.error('[usePlaySessionStats] network error:', err);
            }
        };

        EventBus.on('play-ready', onReady);
        EventBus.on('play-session-ended', onEnded);
        return () => {
            EventBus.off('play-ready', onReady);
            EventBus.off('play-session-ended', onEnded);
        };
    }, []);
}
