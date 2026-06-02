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
 * Physics bodies are NOT attached in the constructor — the scene is responsible
 * for calling `entity.addToPhysics()`. This keeps the constructor scene-agnostic.
 
 * The editor is responsible for calling `displayObject.setInteractive(...)` via
 * the EntityManager's `onEntityAdded` hook — not done here for the same reason.
 *
 * Relationship state (which entities stand on this platform) is owned by
 * PlatformRelationshipManager, not here.
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { PlatformData } from '../types/LevelData';
import { TILE_SIZE } from '../../config/GameConfig';
import { ASSET_KEYS } from '../../config/AssetCatalog';

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
    readonly playBehavior = 'solid' as const;

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
        const frames = VARIANT_FRAMES[variant];

        // Build the Container.
        const container = new Phaser.GameObjects.Container(scene, x, y);

        // Top grass layer (no physics body — set up externally by the scene).
        const topLayer = scene.add
            .tileSprite(0, 0, width, TILE_SIZE, ASSET_KEYS.PLATFORM, frames.top)
            .setOrigin(0, 0);

        // Dirt fill layer (no physics body — set up externally by the scene).
        const fillLayer = scene.add
            .tileSprite(0, TILE_SIZE, width, Math.max(height - TILE_SIZE, 0), ASSET_KEYS.PLATFORM, frames.fill)
            .setOrigin(0, 0);

        container.add([topLayer, fillLayer]);

        super(container, id, variant);

        this._width = width;
        this._height = height;
        this.topLayer = topLayer;
        this.fillLayer = fillLayer;

        this.resize(width, height);

        // Register with the scene display list.
        scene.add.existing(this.displayObject);
    }

    // -----------------------------------------------------------------------
    // Collidables (play scene physics)
    // -----------------------------------------------------------------------

    /**
     * Platforms use a Container as their displayObject. Arcade Physics on a
     * Container defaults to a centered body. We override this to force the
     * body to be correctly sized and top-left aligned.
     */
    override addToPhysics(group: Phaser.Physics.Arcade.StaticGroup | Phaser.Physics.Arcade.Group): void {
        super.addToPhysics(group);

        const body = this.displayObject.body as Phaser.Physics.Arcade.StaticBody;
        if (body) {
            // false = do not center the body over the (x,y) origin.
            body.setSize(this.width, this.height, false);
            body.position.set(this.x, this.y);
        }
    }

    /**
     * Containers have no automatic hit area, so we must supply an explicit
     * Rectangle that covers the full platform extent.  The Editor passes this
     * to `displayObject.setInteractive()` and never needs to know that
     * Platform uses a Container internally.
     *
     * `resize()` keeps the hitArea in sync as the platform is resized.
     */
    getEditorInteractiveConfig(): Phaser.Types.Input.InputConfiguration {
        return {
            hitArea: new Phaser.Geom.Rectangle(this.width / 2, this.height / 2, this.width, this.height),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            draggable: true,
        };
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

        // Keep the hit area in sync (only present in the editor after setInteractive).
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
        } else {
            // Multi-tile platform — show fill layer beneath the top row.
            this.fillLayer.setActive(true).setVisible(true);
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

    serialize(): PlatformData {
        return {
            entityType: ASSET_KEYS.PLATFORM,
            id: this.id,
            x: this.x,
            y: this.y,
            width: this._width,
            height: this._height,
            variant: this.variant,
        };
    }

}
