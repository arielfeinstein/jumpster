/**
 * Checkpoint.ts
 *
 * A 32×64 (1-tile wide, 2-tiles tall) checkpoint flag.  Requires a platform
 * below to be placed.
 *
 * Texture key: 'checkpoint-flag' (spritesheet, frame 4 used as static icon).
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { CheckpointData } from '../types/LevelData';
import { TILE_SIZE } from '../../config';

export default class Checkpoint extends GameEntity {

    readonly entityType = 'checkpoint' as const;
    readonly requiresPlatformBelow = true;
    readonly isSingleton = false;
    readonly isResizable = false;
    readonly playBehavior = 'checkpoint' as const;

    readonly displayObject: Phaser.GameObjects.Image;

    get width(): number { return TILE_SIZE; }
    get height(): number { return TILE_SIZE * 2; }

    /**
     * @param scene  The Phaser scene that owns this entity.
     * @param x      World-space top-left x (grid-snapped).
     * @param y      World-space top-left y (grid-snapped).
     * @param id     Optional stable UUID — supply when deserialising.
     */
    constructor(scene: Phaser.Scene, x: number, y: number, id?: string) {
        super(id);
        // Frame 4 is the closed/idle frame used in the editor palette.
        this.displayObject = scene.add.image(x, y, 'checkpoint-flag', 4).setOrigin(0, 0);
    }

    createGhost(scene: Phaser.Scene): Checkpoint {
        const ghost = new Checkpoint(scene, this.x, this.y);
        ghost.setAlpha(0.5);
        return ghost;
    }

    serialize(): CheckpointData {
        return { entityType: 'checkpoint', id: this.id, x: this.x, y: this.y };
    }
}
