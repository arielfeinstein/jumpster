import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './game/main';
import { EventBus, onEvent } from './game/EventBus';
import { usePlaySessionStats } from './hooks/usePlaySessionStats';
import { useEditorSave } from './hooks/useEditorSave';

export interface IRefPhaserGame
{
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps
{
    currentActiveScene?: (scene_instance: Phaser.Scene) => void
    children?: React.ReactNode;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({ currentActiveScene, children }, ref)
{
    // TODO: consider extracting the useLayoutEffect and useEffect hooks below to src/hooks/
    usePlaySessionStats();
    useEditorSave();

    const game = useRef<Phaser.Game | null>(null!);

    useLayoutEffect(() =>
    {
        if (game.current === null)
        {

            game.current = StartGame("game-container");

            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: null });
            } else if (ref)
            {
                ref.current = { game: game.current, scene: null };
            }

        }

        return () =>
        {
            if (game.current)
            {
                game.current.destroy(true);
                if (game.current !== null)
                {
                    game.current = null;
                }
            }
        }
    }, [ref]);

    useEffect(() =>
    {
        onEvent('current-scene-ready', ({ scene }) =>
        {
            if (currentActiveScene && typeof currentActiveScene === 'function')
            {

                currentActiveScene(scene);

            }

            if (typeof ref === 'function')
            {

                ref({ game: game.current, scene });

            } else if (ref)
            {

                ref.current = { game: game.current, scene };

            }

        });
        return () =>
        {

            EventBus.removeListener('current-scene-ready');
        
        }
    }, [currentActiveScene, ref]);

    return (
        <div id="game-container">{children}</div>
    );

});
