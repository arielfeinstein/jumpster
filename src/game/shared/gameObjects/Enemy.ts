/**
 * Enemy.ts
 *
 * A 32×32 enemy entity.  Wraps a Phaser.GameObjects.Image and exposes it
 * as `displayObject` so the editor and game scene can each set up the
 * behaviour they need (interactivity or physics) independently.
 *
 * Texture key: 'enemy' (spritesheet, frame 1 used as the static editor icon).
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { TILE_SIZE } from '../../config';

export default class Enemy extends GameEntity {

    readonly entityType = 'enemy' as const;
    readonly requiresPlatformBelow = true;
    readonly isSingleton = false;
    readonly isResizable = false;
    readonly playBehavior = 'stompable' as const;

    readonly displayObject: Phaser.GameObjects.Image;

    get width(): number { return TILE_SIZE; }
    get height(): number { return TILE_SIZE; }

    /**
     * @param scene  The Phaser scene that owns this entity.
     * @param x      World-space top-left x (grid-snapped).
     * @param y      World-space top-left y (grid-snapped).
     * @param id     Optional stable UUID — supply when deserialising from a save file.
     */
    constructor(scene: Phaser.Scene, x: number, y: number, id?: string) {
        super(id);
        // Frame 1 is the standing pose used as the palette / editor icon.
        this.displayObject = scene.add.image(x, y, 'enemy', 1).setOrigin(0, 0);
    }

    createGhost(scene: Phaser.Scene): Enemy {
        const ghost = new Enemy(scene, this.x, this.y);
        ghost.setAlpha(0.5);
        return ghost;
    }
}
