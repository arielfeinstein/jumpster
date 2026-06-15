import { useLayoutEffect, useRef } from 'react';
import type React from 'react';
import StartGame from '../game/main';

type PhaserGameRef = { game: Phaser.Game | null; scene: Phaser.Scene | null };

/**
 * Initialises the Phaser game instance on mount and destroys it on unmount.
 * Must be called from a component that owns the #game-container element (e.g. PhaserGame).
 * Returns the stable game ref so sibling hooks can read game.current.
 */
export function usePhaserGame(ref: React.ForwardedRef<PhaserGameRef>) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const game = useRef<Phaser.Game | null>(null!);

    useLayoutEffect(() => {
        if (game.current === null) {
            game.current = StartGame('game-container');

            if (typeof ref === 'function') {
                ref({ game: game.current, scene: null });
            } else if (ref) {
                ref.current = { game: game.current, scene: null };
            }
        }

        return () => {
            if (game.current) {
                game.current.destroy(true);
                if (game.current !== null) {
                    game.current = null;
                }
            }
        };
    }, [ref]);

    return game;
}
