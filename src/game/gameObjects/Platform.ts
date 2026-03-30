/**
 * Platform.ts
 *
 * A resizable platform composed of two TileSprites stacked vertically:
 *   - topLayer  : the grass/surface row (always 1 tile tall, texture frame 0)
 *   - fillLayer : the dirt fill below  (height - 1 tile,   texture frame 1)
 *
 * Platform extends GameEntity and wraps a Phaser.GameObjects.Container as its
 * `displayObject`.  The Container is added to the scene inside the constructor
 * so callers do not need to call `scene.add.existing()`.
 *
 * Physics bodies are attached to each TileSprite individually so the game
 * scene can add colliders against `topLayer` and `fillLayer` independently.
 *
 * Relationship state (which entities stand on this platform) is owned by
 * PlatformRelationshipManager, not here.
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { TILE_SIZE } from '../config';

export type PlatformVariant = 'grass-1' | 'grass-2' | 'grass-3';

/** Maps each variant to the spritesheet frame indices for the top and fill layers. */
const VARIANT_FRAMES: Record<PlatformVariant, { top: number; fill: number }> = {
    'grass-1': { top: 0, fill: 1 },
    'grass-2': { top: 2, fill: 3 },
    'grass-3': { top: 4, fill: 5 },
};

export default class Platform extends GameEntity {

    readonly entityType = 'platform' as const;
    readonly requiresPlatformBelow = false;
    readonly isSingleton = false;
    readonly isResizable = true;

    // The Phaser Container that holds the two TileSprites.
    readonly displayObject: Phaser.GameObjects.Container;

    /** Surface row — 1 tile tall, always visible. */
    topLayer: Phaser.GameObjects.TileSprite;

    /** Dirt fill — hidden when height === TILE_SIZE, otherwise height - TILE_SIZE tall. */
    fillLayer: Phaser.GameObjects.TileSprite;

    // Current logical size (the Container's built-in width/height lags by one frame).
    private _width: number;
    private _height: number;

    get width(): number { return this._width; }
    get height(): number { return this._height; }

    /**
     * @param scene    The Phaser scene that owns this entity.
     * @param x        World-space top-left x (grid-snapped).
     * @param y        World-space top-left y (grid-snapped).
     * @param width    Initial width in pixels (multiples of TILE_SIZE).
     * @param height   Initial height in pixels (multiples of TILE_SIZE).
     * @param variant  Which texture variant to use (determines spritesheet frames).
     * @param id       Optional stable UUID — supply when deserialising.
     */
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        width: number,
        height: number,
        variant: PlatformVariant = 'grass-1',
        id?: string,
    ) {
        super(id, variant);

        this._width = width;
        this._height = height;

        const frames = VARIANT_FRAMES[variant];

        // Build the Container.
        this.displayObject = new Phaser.GameObjects.Container(scene, x, y);

        // Top grass layer.
        this.topLayer = scene.add
            .tileSprite(0, 0, width, TILE_SIZE, 'platform', frames.top)
            .setOrigin(0, 0);
        scene.physics.add.existing(this.topLayer, true);

        // Dirt fill layer.
        this.fillLayer = scene.add
            .tileSprite(0, TILE_SIZE, width, Math.max(height - TILE_SIZE, 0), 'platform', frames.fill)
            .setOrigin(0, 0);
        scene.physics.add.existing(this.fillLayer, true);

        this.displayObject.add([this.topLayer, this.fillLayer]);

        // Make the container interactive and draggable (editor setup).
        const hitArea = new Phaser.Geom.Rectangle(width / 2, height / 2, width, height);
        this.displayObject.setInteractive({
            hitArea,
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            draggable: true,
        });

        this.resize(width, height);

        // Register with the scene display list.
        scene.add.existing(this.displayObject);
    }

    // -----------------------------------------------------------------------
    // Resize
    // -----------------------------------------------------------------------

    /**
     * Resizes the platform to the given pixel dimensions.
     *
     * Height logic:
     *   - 1 tile:  only topLayer is shown; fillLayer is hidden and disabled.
     *   - 2+ tiles: both layers shown; fillLayer height = height - TILE_SIZE.
     */
    resize(newWidth: number, newHeight: number): void {
        this._width = newWidth;
        this._height = newHeight;

        this.displayObject.setSize(newWidth, newHeight);

        this.topLayer.width = newWidth;
        this.fillLayer.width = newWidth;

        // Keep the hit area in sync.
        if (this.displayObject.input?.hitArea) {
            const hitArea = this.displayObject.input.hitArea as Phaser.Geom.Rectangle;
            hitArea.x = newWidth / 2;
            hitArea.y = newHeight / 2;
            hitArea.width = newWidth;
            hitArea.height = newHeight;
        }

        if (newHeight <= TILE_SIZE) {
            // Single-tile-high platform — show only the top row.
            this.topLayer.height = TILE_SIZE;
            this.fillLayer.setActive(false).setVisible(false);
            this.fillLayer.height = 0;
            (this.fillLayer.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        } else {
            // Multi-tile platform — show fill layer beneath the top row.
            this.fillLayer.setActive(true).setVisible(true);
            (this.fillLayer.body as Phaser.Physics.Arcade.StaticBody).enable = true;
            this.topLayer.height = TILE_SIZE;
            this.fillLayer.height = newHeight - TILE_SIZE;
        }
    }

    // -----------------------------------------------------------------------
    // Visual helpers (override GameEntity defaults to tint both TileSprites)
    // -----------------------------------------------------------------------

    setTint(color: number): this {
        this.topLayer.setTint(color);
        this.fillLayer.setTint(color);
        return this;
    }

    clearTint(): this {
        this.topLayer.clearTint();
        this.fillLayer.clearTint();
        return this;
    }

    // -----------------------------------------------------------------------
    // Ghost (placement preview)
    // -----------------------------------------------------------------------

    createGhost(scene: Phaser.Scene): Platform {
        const ghost = new Platform(scene, this.x, this.y, this._width, this._height, this.variant as PlatformVariant);
        ghost.setAlpha(0.5);
        return ghost;
    }

}
