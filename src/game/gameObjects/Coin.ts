/**
 * Coin.ts
 *
 * A 32×32 collectible coin entity.  Coins do NOT require a platform below —
 * they can float freely, enabling mid-air coin trails.
 *
 * Texture key: 'coin'.
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { TILE_SIZE } from '../config';

export default class Coin extends GameEntity {

    readonly entityType = 'coin' as const;
    readonly requiresPlatformBelow = false;
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
        this.displayObject = scene.add.image(x, y, 'coin').setOrigin(0, 0);
    }

    createGhost(scene: Phaser.Scene): Coin {
        const ghost = new Coin(scene, this.x, this.y);
        ghost.setAlpha(0.5);
        return ghost;
    }
}
