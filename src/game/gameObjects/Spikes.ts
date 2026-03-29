/**
 * Spikes.ts
 *
 * A 32×32 hazard entity that kills the player on contact.
 * Spikes must rest on a platform — they sit flush against a surface.
 *
 * Texture key: 'spikes' (spritesheet, frame 0).
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { TILE_SIZE } from '../config';

export default class Spikes extends GameEntity {

    readonly entityType = 'spikes' as const;
    readonly requiresPlatformBelow = true;
    readonly isSingleton = false;
    readonly isResizable = false;

    readonly displayObject: Phaser.GameObjects.Image;

    get width(): number { return TILE_SIZE; }
    get height(): number { return TILE_SIZE; }

    /**
     * @param scene  The Phaser scene that owns this entity.
     * @param x      World-space top-left x (grid-snapped).
     * @param y      World-space top-left y (grid-snapped).
     * @param id     Optional stable UUID — supply when deserialising.
     */
    constructor(scene: Phaser.Scene, x: number, y: number, id?: string) {
        super(id);
        this.displayObject = scene.add.image(x, y, 'spikes', 2).setOrigin(0, 0);
    }

    createGhost(scene: Phaser.Scene): Spikes {
        const ghost = new Spikes(scene, this.x, this.y);
        ghost.setAlpha(0.5);
        return ghost;
    }
}
