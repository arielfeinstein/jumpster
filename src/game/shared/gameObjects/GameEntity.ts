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
 *   - Editor: entity.displayObject.setInteractive(entity.getEditorInteractiveConfig())
 *   - Game:   scene.physics.add.collider(player, entity.getCollidables())
 *
 * Subclass responsibilities:
 *   - Declare the rule properties (entityType, requiresPlatformBelow, playBehavior, …)
 *   - Create the Phaser display object and expose it via `displayObject`
 *   - Implement `createGhost(scene)` to return a semi-transparent preview copy
 *   - Override `getCollidables()` if physics bodies are on child objects (e.g. Platform)
 */

import Phaser from 'phaser';
import { EntityType } from '../types/EntityType';
import { PlayBehavior } from '../types/PlayBehavior';
import { EntityData } from '../types/LevelData';

// EntitySnapshot has been removed — commands now store EntityData directly via serialize().

export default abstract class GameEntity {

    // -----------------------------------------------------------------------
    // Identity
    // -----------------------------------------------------------------------

    /** Stable UUID assigned at creation. Persisted in save files. */
    readonly id: string;

    /** Variant key for texture/skin selection (e.g. 'grass-1' for platforms). */
    readonly variant: string;

    constructor(id?: string, variant?: string) {
        this.id = id ?? crypto.randomUUID();
        this.variant = variant ?? 'default';
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

    /**
     * Declares how this entity participates in gameplay physics.
     * The play scene groups entities by this value and sets up colliders/overlaps
     * per group — no per-entity branching needed in the scene.
     */
    abstract readonly playBehavior: PlayBehavior;

    abstract get width(): number;
    abstract get height(): number;

    // -----------------------------------------------------------------------
    // Phaser display object
    // -----------------------------------------------------------------------

    /**
     * The underlying Phaser object.  Callers use this for scene-specific setup
     * (interactivity, camera follow) rather than reaching into GameEntity internals.
     * For physics setup, prefer `getCollidables()`.
     */
    abstract readonly displayObject: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite | Phaser.GameObjects.Container;

    /**
     * Returns the Phaser game objects that should receive physics bodies.
     * Defaults to `[this.displayObject]`.
     *
     * Platform overrides this to return its inner TileSprites directly, because
     * Arcade physics on a Container does not composite child bodies.
     *
     * The play scene calls this method and never needs to know about
     * Platform's internal structure.
     */
    getCollidables(): Phaser.GameObjects.GameObject[] {
        return [this.displayObject];
    }

    /**
     * Returns the Phaser interactive configuration that the editor should pass
     * to `displayObject.setInteractive()`.
     *
     * The default covers every entity whose `displayObject` is an Image or
     * TileSprite — Phaser derives the hit area automatically from the object's
     * bounds, so only `draggable: true` is needed.
     *
     * Subclasses whose `displayObject` is a Container MUST override this,
     * because Containers have no automatic hit area and require an explicit
     * `hitArea` + `hitAreaCallback`.  (Platform is the only current case.)
     *
     * The Editor calls this method and never needs to know about the entity's
     * internal structure.
     */
    getEditorInteractiveConfig(): Phaser.Types.Input.InputConfiguration {
        return { draggable: true };
    }

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

    /**
     * Returns the exact EntityData union member for this entity.
     * Commands and the serializer store this directly — no separate snapshot type needed.
     * Each subclass returns only the fields relevant to its type.
     */
    abstract serialize(): EntityData;
}
