import { useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { apiFetch } from '@/lib/api';
import type { LevelData } from '../game/shared/types/LevelData';

/**
 * Listens for editor-level-saved and persists the level to the API.
 * Must be called from a component that outlives the Editor scene (e.g. PhaserGame).
 * The scene has already transitioned to MainMenu by the time the API call resolves —
 * this is intentionally fire-and-forget, consistent with usePlaySessionStats.
 */
export function useEditorSave() {
    useEffect(() => {
        const handler = async ({ levelId, title, levelData }: { levelId: string | null; title: string; levelData: LevelData }) => {
            try {
                if (!levelId) {
                    const res = await apiFetch('/api/levels', {
                        method: 'POST',
                        body: JSON.stringify({ title, data: levelData }),
                    });
                    if (!res.ok) console.error('[useEditorSave] failed:', res.status);
                } else {
                    const res = await apiFetch(`/api/levels/${levelId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ title, data: levelData }),
                    });
                    if (!res.ok) console.error('[useEditorSave] failed:', res.status);
                }
            } catch (err) {
                console.error('[useEditorSave] network error:', err);
            }
        };

        EventBus.on('editor-level-saved', handler);
        return () => { EventBus.off('editor-level-saved', handler); };
    }, []);
}
