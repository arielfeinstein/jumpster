/**
 * Spikes.ts
 *
 * A hazard entity that kills the player on contact.
 * Spikes must rest on a platform — they sit flush against a surface.
 *
 * Resizable on the horizontal axis only.  Uses a TileSprite so the
 * spike texture repeats cleanly when stretched wider than one tile.
 *
 * Texture key: 'spikes' (spritesheet, frame 2).
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { TILE_SIZE } from '../config';

export default class Spikes extends GameEntity {

    readonly entityType = 'spikes' as const;
    readonly requiresPlatformBelow = true;
    readonly isSingleton = false;
    readonly isResizable = true;

    readonly displayObject: Phaser.GameObjects.TileSprite;

    private _width: number;

    get width(): number { return this._width; }
    get height(): number { return TILE_SIZE; }

    /**
     * @param scene  The Phaser scene that owns this entity.
     * @param x      World-space top-left x (grid-snapped).
     * @param y      World-space top-left y (grid-snapped).
     * @param width  Initial width in pixels (multiples of TILE_SIZE). Defaults to one tile.
     * @param id     Optional stable UUID — supply when deserialising.
     */
    constructor(scene: Phaser.Scene, x: number, y: number, width: number = TILE_SIZE, id?: string) {
        super(id);
        this._width = width;

        this.displayObject = scene.add
            .tileSprite(x, y, width, TILE_SIZE, 'spikes', 2)
            .setOrigin(0, 0);
    }

    resize(newWidth: number, _newHeight: number): void {
        this._width = newWidth;
        this.displayObject.width = newWidth;

        // Keep the hit area in sync so pointer events cover the full width.
        if (this.displayObject.input?.hitArea) {
            const hitArea = this.displayObject.input.hitArea as Phaser.Geom.Rectangle;
            hitArea.width = newWidth;
        }
    }

    createGhost(scene: Phaser.Scene): Spikes {
        const ghost = new Spikes(scene, this.x, this.y, this._width);
        ghost.setAlpha(0.5);
        return ghost;
    }
}
