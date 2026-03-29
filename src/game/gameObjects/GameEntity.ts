/**
 * GameEntity.ts
 *
 * Abstract base class for every entity that can exist in the level — used in
 * BOTH the editor and the game scene.  It is intentionally NOT a Phaser
 * GameObject; instead, each subclass wraps its underlying Phaser display
 * object and exposes it through `displayObject`.
 *
 * This separation lets the editor and the game scene each set up only the
 * behaviour they need:
 *   - Editor: entity.displayObject.setInteractive({ draggable: true })
 *   - Game:   scene.physics.add.collider(player, entity.displayObject)
 *
 * Subclass responsibilities:
 *   - Declare the four rule properties (entityType, requiresPlatformBelow, …)
 *   - Create the Phaser display object and expose it via `displayObject`
 *   - Implement `createGhost(scene)` to return a semi-transparent preview copy
 */

import Phaser from 'phaser';
import { EntityType, EntitySnapshot } from '../scenes/Editor/types/EditorTypes';
import { EntityData } from '../scenes/Editor/types/LevelData';

export default abstract class GameEntity {

    // -----------------------------------------------------------------------
    // Identity
    // -----------------------------------------------------------------------

    /** Stable UUID assigned at creation. Persisted in save files. */
    readonly id: string;

    constructor(id?: string) {
        this.id = id ?? crypto.randomUUID();
    }

    // -----------------------------------------------------------------------
    // Subclass-defined rules (own the metadata — Registry does NOT duplicate)
    // -----------------------------------------------------------------------

    abstract readonly entityType: EntityType;

    /** Whether this entity must rest on a platform when placed. */
    abstract readonly requiresPlatformBelow: boolean;

    /** Whether at most one of this type may exist in the level at a time. */
    abstract readonly isSingleton: boolean;

    /** Whether the editor exposes resize handles for this entity. */
    abstract readonly isResizable: boolean;

    abstract get width(): number;
    abstract get height(): number;

    // -----------------------------------------------------------------------
    // Phaser display object
    // -----------------------------------------------------------------------

    /**
     * The underlying Phaser object.  Callers use this for scene-specific setup
     * (physics, interactivity) rather than reaching into GameEntity internals.
     */
    abstract readonly displayObject: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite | Phaser.GameObjects.Container;

    // -----------------------------------------------------------------------
    // Position (delegates to displayObject)
    // -----------------------------------------------------------------------

    get x(): number { return this.displayObject.x; }
    set x(v: number) { this.displayObject.x = v; }

    get y(): number { return this.displayObject.y; }
    set y(v: number) { this.displayObject.y = v; }

    // -----------------------------------------------------------------------
    // Ghost creation (for placement preview)
    // -----------------------------------------------------------------------

    /**
     * Returns a semi-transparent copy of this entity to act as a drag ghost.
     * The ghost is added to the scene by the subclass.
     */
    abstract createGhost(scene: Phaser.Scene): GameEntity;

    // -----------------------------------------------------------------------
    // Resize (no-op default — resizable subclasses override)
    // -----------------------------------------------------------------------

    /**
     * Resizes the entity to the given pixel dimensions.
     * Non-resizable entities inherit this no-op; the resize system guards
     * against calling it via the ResizeConfig lookup in EntityRegistry.
     */
    resize(_width: number, _height: number): void { }

    // -----------------------------------------------------------------------
    // Visual helpers (shared implementations; Platform overrides setTint)
    // -----------------------------------------------------------------------

    setAlpha(alpha: number): this {
        this.displayObject.setAlpha(alpha);
        return this;
    }

    setVisible(visible: boolean): this {
        this.displayObject.setVisible(visible);
        return this;
    }

    setTint(color: number): this {
        if (this.displayObject instanceof Phaser.GameObjects.Image ||
            this.displayObject instanceof Phaser.GameObjects.TileSprite) {
            this.displayObject.setTint(color);
        }
        return this;
    }

    clearTint(): this {
        if (this.displayObject instanceof Phaser.GameObjects.Image ||
            this.displayObject instanceof Phaser.GameObjects.TileSprite) {
            this.displayObject.clearTint();
        }
        return this;
    }

    destroy(): void {
        this.displayObject.destroy();
    }

    // -----------------------------------------------------------------------
    // Serialisation
    // -----------------------------------------------------------------------

    /** Produces the minimal plain-data snapshot needed to recreate this entity. */
    serialize(): EntityData {
        return {
            id: this.id,
            entityType: this.entityType,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }

    /** Compact snapshot used by Commands for undo/redo state. */
    snapshot(): EntitySnapshot {
        return {
            id: this.id,
            entityType: this.entityType,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }
}
