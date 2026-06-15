import { useEffect } from 'react';
import type React from 'react';
import { EventBus, onEvent } from '../game/EventBus';

type PhaserGameRef = { game: Phaser.Game | null; scene: Phaser.Scene | null };

/**
 * Listens for the current-scene-ready event and updates both the forwarded ref and
 * the currentActiveScene callback with the newly active Phaser scene.
 * Must be called from the same component as usePhaserGame so it shares the game ref.
 */
export function useCurrentScene(
    ref: React.ForwardedRef<PhaserGameRef>,
    currentActiveScene: ((scene: Phaser.Scene) => void) | undefined,
    game: React.RefObject<Phaser.Game | null>,
) {
    useEffect(() => {
        onEvent('current-scene-ready', ({ scene }) => {
            if (currentActiveScene && typeof currentActiveScene === 'function') {
                currentActiveScene(scene);
            }

            if (typeof ref === 'function') {
                ref({ game: game.current, scene });
            } else if (ref) {
                ref.current = { game: game.current, scene };
            }
        });

        return () => {
            EventBus.removeListener('current-scene-ready');
        };
    }, [currentActiveScene, ref]);
}
