/**
 * DragController.ts
 *
 * Unified drag handler for both placement and movement of entities.
 *
 * Two modes:
 *   'place' — a ghost entity was created by PlacementController; on valid drop
 *             it executes PlaceCommand (entity becomes opaque and is registered).
 *             On invalid drop or cancel: the ghost is destroyed.
 *
 *   'move'  — one or more existing entities are being dragged; on valid drop it
 *             executes MoveCommand.  On invalid drop: entities are restored to
 *             their original positions.
 *
 * Validation uses EntityManager.canPlace(entity, excludeIds) so:
 *   - Place mode: excludeIds is empty → duplicate singletons are rejected.
 *   - Move mode:  excludeIds contains each entity's own ID → no self-collision.
 *
 * The controller listens to Phaser pointer events on the scene (not on individual
 * entities) so multi-entity drags work uniformly.
 */

import Phaser from 'phaser';
import GameEntity from '../../../gameObjects/GameEntity';
import EntityManager from '../managers/EntityManager';
import PlatformRelationshipManager from '../managers/PlatformRelationshipManager';
import CommandHistory from '../commands/CommandHistory';
import PlaceCommand from '../commands/PlaceCommand';
import MoveCommand, { MoveEntry } from '../commands/MoveCommand';
import { DragMode, RED_TINT, DRAG_THRESHOLD } from '../types/EditorTypes';
import GridManager from '../managers/GridManager';

export default class DragController {

    private readonly scene: Phaser.Scene;
    private readonly entityManager: EntityManager;
    private readonly relManager: PlatformRelationshipManager;
    private readonly history: CommandHistory;

    // -----------------------------------------------------------------------
    // Active drag state (null when no drag is in progress)
    // -----------------------------------------------------------------------

    private mode: DragMode | null = null;
    private dragEntities: GameEntity[] = [];

    /** Original positions captured at drag-start (restore on invalid drop). */
    private originalPositions: Array<{ x: number; y: number }> = [];

    /** Pointer position at drag-start (world coords). */
    private dragStartWorld = new Phaser.Math.Vector2();

    /** Whether the active drag position is valid for placement. */
    private isValid = false;

    /** Whether a drag is currently in progress. */
    private active = false;

    constructor(
        scene: Phaser.Scene,
        entityManager: EntityManager,
        relManager: PlatformRelationshipManager,
        history: CommandHistory,
    ) {
        this.scene = scene;
        this.entityManager = entityManager;
        this.relManager = relManager;
        this.history = history;

        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
    }

    // -----------------------------------------------------------------------
    // Public: start a drag
    // -----------------------------------------------------------------------

    /**
     * Begin a 'place' drag for a single ghost entity.
     * The ghost is already in the scene at alpha 0.5.
     */
    startPlaceDrag(ghost: GameEntity): void {
        const ptr = this.scene.input.activePointer;
        this.beginDrag([ghost], 'place', ptr.worldX, ptr.worldY);
    }

    /**
     * Begin a 'move' drag for one or more selected entities.
     * Entities are temporarily removed from the grid to allow free movement.
     */
    startMoveDrag(entities: GameEntity[]): void {
        if (entities.length === 0) return;

        const ptr = this.scene.input.activePointer;
        this.beginDrag(entities, 'move', ptr.worldX, ptr.worldY);

        // Remove from grid so they don't block themselves.
        for (const e of this.dragEntities) {
            this.entityManager.removeEntity(e);
            e.setAlpha(0.5);
        }
    }

    // -----------------------------------------------------------------------
    // Private: drag lifecycle
    // -----------------------------------------------------------------------

    private beginDrag(entities: GameEntity[], mode: DragMode, worldX: number, worldY: number): void {
        this.mode = mode;
        this.dragEntities = [...entities];
        this.originalPositions = entities.map(e => ({ x: e.x, y: e.y }));
        this.dragStartWorld.set(worldX, worldY);
        this.active = true;
        this.isValid = false;
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.active || !pointer.isDown) return;

        const snapped = GridManager.snapXY(pointer.worldX, pointer.worldY);

        // Compute delta from start (in snapped steps).
        const startSnapped = GridManager.snapXY(this.dragStartWorld.x, this.dragStartWorld.y);
        const dx = snapped.x - startSnapped.x;
        const dy = snapped.y - startSnapped.y;

        // Move all entities by the delta.
        for (let i = 0; i < this.dragEntities.length; i++) {
            const e = this.dragEntities[i];
            e.x = this.originalPositions[i].x + dx;
            e.y = this.originalPositions[i].y + dy;
        }

        // Validate all entities.
        this.isValid = this.validatePositions();

        // Tint feedback.
        if (this.isValid) {
            for (const e of this.dragEntities) e.clearTint();
        } else {
            for (const e of this.dragEntities) e.setTint(RED_TINT);
        }
    }

    private onPointerUp(): void {
        if (!this.active) return;
        this.active = false;

        if (this.isValid) {
            this.commit();
        } else {
            this.cancel();
        }

        // Reset.
        for (const e of this.dragEntities) e.clearTint();
        this.dragEntities = [];
        this.originalPositions = [];
        this.mode = null;
    }

    private commit(): void {
        if (this.mode === 'place') {
            const cmd = new PlaceCommand(
                this.scene,
                this.dragEntities,
                this.entityManager,
                this.relManager,
            );
            this.history.executeCommand(cmd);
        } else {
            // Build MoveEntry[] — entities are currently at the new positions.
            const entries: MoveEntry[] = this.dragEntities.map((e, i) => ({
                entity: e,
                fromX: this.originalPositions[i].x,
                fromY: this.originalPositions[i].y,
                toX: e.x,
                toY: e.y,
            }));

            // Re-add to grid first (MoveCommand will re-remove + re-add via execute).
            for (const e of this.dragEntities) {
                e.x = this.originalPositions[this.dragEntities.indexOf(e)].x;
                e.y = this.originalPositions[this.dragEntities.indexOf(e)].y;
                this.entityManager.addEntity(e);
            }

            const cmd = new MoveCommand(entries, this.entityManager, this.relManager);
            this.history.executeCommand(cmd);

            for (const e of this.dragEntities) e.setAlpha(1);
        }
    }

    private cancel(): void {
        if (this.mode === 'place') {
            for (const e of this.dragEntities) e.destroy();
        } else {
            // Restore original positions and re-register.
            for (let i = 0; i < this.dragEntities.length; i++) {
                const e = this.dragEntities[i];
                e.x = this.originalPositions[i].x;
                e.y = this.originalPositions[i].y;
                e.setAlpha(1);
                this.entityManager.addEntity(e);
                this.relManager.onEntityPlaced(e);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    private validatePositions(): boolean {
        const excludeIds = this.mode === 'move'
            ? new Set(this.dragEntities.map(e => e.id))
            : new Set<string>();

        for (const entity of this.dragEntities) {
            if (!this.entityManager.canPlace(entity, excludeIds)) return false;
        }
        return true;
    }

    // -----------------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------------

    destroy(): void {
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
    }
}
