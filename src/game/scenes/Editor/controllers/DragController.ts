/**
 * DragController.ts
 *
 * Handles drag-to-reposition for entities that already exist in the level.
 *
 * When the user presses and drags a placed entity the editor temporarily
 * removes it from the spatial grid, lets the user reposition it with live
 * red-tint feedback, and on release either commits the new position via
 * MoveCommand or restores the original position if the drop is invalid.
 *
 * Placing brand-new entities is handled separately by PlacementController
 * (click-to-select from the dock, then click-to-place on the canvas).
 */

import Phaser from 'phaser';
import GameEntity from '../../../gameObjects/GameEntity';
import EntityManager from '../managers/EntityManager';
import PlatformRelationshipManager from '../managers/PlatformRelationshipManager';
import CommandHistory from '../commands/CommandHistory';
import MoveCommand, { MoveEntry } from '../commands/MoveCommand';
import { RED_TINT } from '../types/EditorTypes';
import GridManager from '../managers/GridManager';

export default class DragController {

    private readonly scene: Phaser.Scene;
    private readonly entityManager: EntityManager;
    private readonly relManager: PlatformRelationshipManager;
    private readonly history: CommandHistory;

    // -----------------------------------------------------------------------
    // Active drag state (null / empty when no drag is in progress)
    // -----------------------------------------------------------------------

    private dragEntities: GameEntity[] = [];

    /** Original positions captured at drag-start (restored on invalid drop). */
    private originalPositions: Array<{ x: number; y: number }> = [];

    /** Pointer position at drag-start (world coords). */
    private dragStartWorld = new Phaser.Math.Vector2();

    /** Whether the active drag position is valid for all dragged entities. */
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
    // Public: start a move drag
    // -----------------------------------------------------------------------

    /**
     * Begin dragging one or more existing entities to a new position.
     * Entities are temporarily removed from the spatial grid so they do not
     * block their own placement validation.
     */
    startMoveDrag(entities: GameEntity[]): void {
        if (entities.length === 0) return;

        const ptr = this.scene.input.activePointer;
        this.dragEntities = [...entities];
        this.originalPositions = entities.map(e => ({ x: e.x, y: e.y }));
        this.dragStartWorld.set(ptr.worldX, ptr.worldY);
        this.active = true;
        this.isValid = false;

        // Remove from grid so they don't block themselves during the drag.
        for (const e of this.dragEntities) {
            this.entityManager.removeEntity(e);
            e.setAlpha(0.5);
        }
    }

    // -----------------------------------------------------------------------
    // Private: drag lifecycle
    // -----------------------------------------------------------------------

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.active || !pointer.isDown) return;

        const snapped = GridManager.snapXY(pointer.worldX, pointer.worldY);

        // Compute delta from drag-start (both snapped to the same grid).
        const startSnapped = GridManager.snapXY(this.dragStartWorld.x, this.dragStartWorld.y);
        const dx = snapped.x - startSnapped.x;
        const dy = snapped.y - startSnapped.y;

        // Apply delta to all dragged entities relative to their original positions.
        for (let i = 0; i < this.dragEntities.length; i++) {
            const e = this.dragEntities[i];
            e.x = this.originalPositions[i].x + dx;
            e.y = this.originalPositions[i].y + dy;
        }

        // Validate all entities — each one must pass canPlace() independently.
        this.isValid = this.validatePositions();

        // Red tint while any position is invalid; clear once all are valid.
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

        // Always clean tint and reset state.
        for (const e of this.dragEntities) e.clearTint();
        this.dragEntities = [];
        this.originalPositions = [];
    }

    private commit(): void {
        // Build MoveEntry[] — entities are currently at the new (valid) positions.
        const entries: MoveEntry[] = this.dragEntities.map((e, i) => ({
            entity: e,
            fromX: this.originalPositions[i].x,
            fromY: this.originalPositions[i].y,
            toX: e.x,
            toY: e.y,
        }));

        // Re-add to grid at original positions first; MoveCommand.execute() will
        // remove and re-add them at the new positions.
        for (let i = 0; i < this.dragEntities.length; i++) {
            const e = this.dragEntities[i];
            e.x = this.originalPositions[i].x;
            e.y = this.originalPositions[i].y;
            this.entityManager.addEntity(e);
        }

        const cmd = new MoveCommand(entries, this.entityManager, this.relManager);
        this.history.executeCommand(cmd);

        for (const e of this.dragEntities) e.setAlpha(1);
    }

    private cancel(): void {
        // Restore original positions and re-register in the spatial grid.
        for (let i = 0; i < this.dragEntities.length; i++) {
            const e = this.dragEntities[i];
            e.x = this.originalPositions[i].x;
            e.y = this.originalPositions[i].y;
            e.setAlpha(1);
            this.entityManager.addEntity(e);
            this.relManager.onEntityPlaced(e);
        }
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    /**
     * Returns true only if every dragged entity can be placed at its current
     * position.  Each entity's own ID is excluded from the overlap check so
     * an entity does not collide with the grid tiles it originally occupied.
     */
    private validatePositions(): boolean {
        const excludeIds = new Set(this.dragEntities.map(e => e.id));
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
