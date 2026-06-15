import React, { forwardRef } from 'react';
import { usePlaySessionStats } from './hooks/usePlaySessionStats';
import { useEditorSave } from './hooks/useEditorSave';
import { usePhaserGame } from './hooks/usePhaserGame';
import { useCurrentScene } from './hooks/useCurrentScene';

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
    usePlaySessionStats();
    useEditorSave();
    const game = usePhaserGame(ref);
    useCurrentScene(ref, currentActiveScene, game);

    return (
        <div id="game-container">{children}</div>
    );

});
