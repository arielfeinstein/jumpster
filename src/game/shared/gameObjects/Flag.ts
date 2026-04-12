/**
 * Flag.ts
 *
 * A 32×64 start or end flag.  Both variants are singletons — only one of each
 * kind may exist in a level at a time.  Both require a platform below.
 *
 * The variant is parameterised through `flagKind` so a single class covers
 * both cases, keeping the registry entry trivial:
 *   new Flag(scene, x, y, 'start-flag')
 *   new Flag(scene, x, y, 'end-flag')
 *
 * Texture keys: 'start-flag', 'end-flag' (both plain images, not spritesheets).
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { PlayBehavior } from '../types/PlayBehavior';
import { TILE_SIZE } from '../../config';

/** The two flag variants this class handles. */
export type FlagKind = 'start-flag' | 'end-flag';

export default class Flag extends GameEntity {

    readonly entityType: FlagKind;
    readonly requiresPlatformBelow = true;
    readonly isSingleton = true;
    readonly isResizable = false;
    readonly playBehavior: PlayBehavior;

    readonly displayObject: Phaser.GameObjects.Image;

    get width(): number { return TILE_SIZE; }
    get height(): number { return TILE_SIZE * 2; }

    /**
     * @param scene     The Phaser scene that owns this entity.
     * @param x         World-space top-left x (grid-snapped).
     * @param y         World-space top-left y (grid-snapped).
     * @param flagKind  'start-flag' or 'end-flag'.
     * @param id        Optional stable UUID — supply when deserialising.
     */
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        flagKind: FlagKind,
        id?: string,
    ) {
        super(id);
        this.entityType = flagKind;
        // Start flag marks the player spawn point; end flag triggers the win condition.
        this.playBehavior = flagKind === 'start-flag' ? 'spawn' : 'goal';
        this.displayObject = scene.add.image(x, y, flagKind).setOrigin(0, 0);
    }

    createGhost(scene: Phaser.Scene): Flag {
        const ghost = new Flag(scene, this.x, this.y, this.entityType);
        ghost.setAlpha(0.5);
        return ghost;
    }
}
