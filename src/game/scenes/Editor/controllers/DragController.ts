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
import Platform from '../../../gameObjects/Platform';
import EntityManager from '../managers/EntityManager';
import PlatformRelationshipManager from '../managers/PlatformRelationshipManager';
import CommandHistory from '../commands/CommandHistory';
import MoveCommand, { MoveEntry } from '../commands/MoveCommand';
import { RED_TINT } from '../types/EditorTypes';
import GridManager from '../managers/GridManager';
import ControllerEvents from '../utils/ControllerEvents';
import { TILE_SIZE } from '../../../config';

export default class DragController extends Phaser.Events.EventEmitter {

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

    /**
     * Non-selected entities left behind on moved platforms that require
     * platform support (set B). Computed at drag-start, validated each frame.
     */
    private strandedEntities: GameEntity[] = [];

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
        super();
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

        // Compute stranded entities BEFORE removing from grid — these are
        // non-selected entities on selected platforms that require platform
        // support. The relationship data is still valid at this point.
        this.strandedEntities = this.computeStrandedEntities();

        this.emit(ControllerEvents.DRAG_STARTED);

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
        this.strandedEntities = [];

        this.emit(ControllerEvents.DRAG_ENDED);
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
     * Returns true only if:
     *   1. No dragged entity overlaps a fixed entity in the grid.
     *   2. Singleton constraints are satisfied.
     *   3. Every dragged entity requiring a platform has full support
     *      (from fixed OR virtual platforms).  (Set A)
     *   4. Every stranded entity (left behind on moved platforms) still
     *      has full platform support.  (Set B)
     */
    private validatePositions(): boolean {
        // Set A: each selected entity at its proposed position.
        for (const entity of this.dragEntities) {
            if (this.entityManager.isOverlapping(entity)) return false;

            if (entity.isSingleton) {
                const existing = this.entityManager.getSingleton(entity.entityType);
                if (existing) return false;
            }

            if (entity.requiresPlatformBelow) {
                if (!this.hasFullPlatformSupport(entity)) return false;
            }
        }

        // Set B: stranded entities at their original positions.
        // Dragged platforms are removed from the grid, so getPlatformsBelow
        // only finds fixed platforms. Virtual platforms at their new positions
        // might still cover stranded entities (e.g. platform nudged slightly).
        for (const entity of this.strandedEntities) {
            if (!this.hasFullPlatformSupport(entity)) return false;
        }

        return true;
    }

    /**
     * Returns non-selected entities sitting on selected platforms that
     * require platform support. Must be called BEFORE entities are removed
     * from the grid so PlatformRelationshipManager data is still valid.
     */
    private computeStrandedEntities(): GameEntity[] {
        const dragIds = new Set(this.dragEntities.map(e => e.id));
        const stranded: GameEntity[] = [];
        const seen = new Set<string>();

        for (const entity of this.dragEntities) {
            if (entity instanceof Platform) {
                for (const obj of this.relManager.getObjectsOnPlatform(entity as Platform)) {
                    if (!dragIds.has(obj.id) && obj.requiresPlatformBelow && !seen.has(obj.id)) {
                        stranded.push(obj);
                        seen.add(obj.id);
                    }
                }
            }
        }

        return stranded;
    }

    /**
     * Returns true if every tile-column directly below `entity` is covered
     * by a platform — either a fixed platform still in the grid, or a
     * virtual platform (a dragged platform at its current drag position).
     */
    private hasFullPlatformSupport(entity: GameEntity): boolean {
        const belowY = entity.y + entity.height;

        for (let x = entity.x; x < entity.x + entity.width; x += TILE_SIZE) {
            // Check fixed platforms in the grid.
            const fixed = this.entityManager.getEntityAt(x, belowY);
            if (fixed instanceof Platform) continue;

            // Check virtual platforms (dragged platforms at current positions).
            let foundVirtual = false;
            for (const dragged of this.dragEntities) {
                if (!(dragged instanceof Platform)) continue;
                if (
                    x >= dragged.x &&
                    x < dragged.x + dragged.width &&
                    belowY >= dragged.y &&
                    belowY < dragged.y + dragged.height
                ) {
                    foundVirtual = true;
                    break;
                }
            }

            if (!foundVirtual) return false;
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
