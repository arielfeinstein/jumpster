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
import { CoinData } from '../types/LevelData';
import { TILE_SIZE } from '../../config/GameConfig';
import { ASSET_KEYS } from '../../config/AssetCatalog';

export default class Coin extends GameEntity {

    readonly entityType = 'coin' as const;
    readonly requiresPlatformBelow = false;
    readonly isSingleton = false;
    readonly isResizable = false;
    readonly playBehavior = 'collectible' as const;

    /** Specific type for this subclass to satisfy physics body checks. */
    declare readonly displayObject: Phaser.GameObjects.Image;

    private readonly scene: Phaser.Scene;

    get width(): number { return TILE_SIZE; }
    get height(): number { return TILE_SIZE; }

    /**
     * @param scene  The Phaser scene that owns this entity.
     * @param x      World-space top-left x (grid-snapped).
     * @param y      World-space top-left y (grid-snapped).
     * @param id     Optional stable UUID — supply when deserialising.
     */
    constructor(scene: Phaser.Scene, x: number, y: number, id?: string) {
        super(scene.add.image(x, y, ASSET_KEYS.COIN).setOrigin(0, 0), id);
        this.scene = scene;
    }

    /**
     * Called when the coin is collected in the play scene.
     * Handles visual feedback and disables physics.
     */
    onCollected(): void {
        // Disable physics immediately
        if (this.displayObject.body) {
            (this.displayObject as Phaser.Physics.Arcade.Image).body!.enable = false;
        }

        // TODO: play coin collect animation (tween)
        // TODO: play coin collect sound
        
        this.displayObject.setVisible(false);
    }

    createGhost(scene: Phaser.Scene): Coin {
        const ghost = new Coin(scene, this.x, this.y);
        ghost.setAlpha(0.5);
        return ghost;
    }

    serialize(): CoinData {
        return { entityType: 'coin', id: this.id, x: this.x, y: this.y };
    }
}
