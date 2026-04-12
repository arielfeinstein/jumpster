/**
 * SelectionController.ts
 *
 * Manages selection state and box-select dragging.
 *
 * Responsibilities:
 *   - Track the set of currently selected GameEntity objects.
 *   - Handle pointer events to update the selection.
 *   - Emit ControllerEvents so the editor can update views and other controllers.
 *
 * This controller does NOT render anything — that is SelectionView's job.
 * It does NOT handle entity drag — that is DragController's job.
 * It knows about Platform only to decide whether resize handles are needed.
 */

import Phaser from 'phaser';
import GameEntity from '../../../shared/gameObjects/GameEntity';
import EntityManager from '../managers/EntityManager';
import GridManager from '../../../shared/managers/GridManager';
import ControllerEvents from '../utils/ControllerEvents';
import { DRAG_THRESHOLD } from '../types/EditorTypes';
import { TILE_SIZE } from '../../../config';

export default class SelectionController extends Phaser.Events.EventEmitter {

    private readonly scene: Phaser.Scene;
    private readonly entityManager: EntityManager;

    // -----------------------------------------------------------------------
    // Selection state
    // -----------------------------------------------------------------------

    private selectedEntities: Set<GameEntity> = new Set();

    // -----------------------------------------------------------------------
    // Box-select drag state
    // -----------------------------------------------------------------------

    private startX = 0;
    private startY = 0;
    private isDragging = false;
    private readonly snappedPointer = new Phaser.Math.Vector2();
    private readonly selectRect = new Phaser.Geom.Rectangle();
    private highlighted: Set<GameEntity> = new Set();
    private currHighlightedFrame: Set<GameEntity> = new Set();

    /** Set true by other controllers to prevent box-select from starting. */
    disableSelectDrag = false;

    constructor(scene: Phaser.Scene, entityManager: EntityManager) {
        super();
        this.scene = scene;
        this.entityManager = entityManager;
        this.setupInputListeners();
    }

    // -----------------------------------------------------------------------
    // Input listeners
    // -----------------------------------------------------------------------

    private setupInputListeners(): void {
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        this.deselectAll();

        const snapped = GridManager.snapXY(pointer.worldX, pointer.worldY);
        this.startX = snapped.x;
        this.startY = snapped.y;
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (this.disableSelectDrag) return;

        // Activate drag once pointer travels past the threshold.
        if (pointer.isDown && !this.isDragging) {
            const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.startX, this.startY);
            if (dist > DRAG_THRESHOLD) this.isDragging = true;
        }
        if (!this.isDragging || !pointer.isDown) return;

        // Update snapped pointer.
        this.snappedPointer.set(pointer.worldX, pointer.worldY);
        GridManager.updateToSnappedCoord(this.snappedPointer);

        // Rebuild the selection rectangle.
        this.updateSelectRect(this.snappedPointer.x, this.snappedPointer.y);

        // Gather entities whose frames intersect the selection rect.
        this.sweepFrame();

        // Emit so SelectionView can redraw outlines.
        this.emit(ControllerEvents.HIGHLITED_OBJS_UPDATED, this.highlighted);
    }

    private onPointerUp(): void {
        if (this.isDragging) {
            this.selectEntities(this.highlighted);
            this.highlighted = new Set();
            this.currHighlightedFrame.clear();
        }

        this.isDragging = false;
        this.disableSelectDrag = false;
        this.emit(ControllerEvents.SELECTION_DRAG_ENDED);
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Programmatically select a set of entities (e.g. after drag or placement).
     * Ignores the call if the set is identical to the current selection.
     */
    selectEntities(entities: Set<GameEntity>): void {
        if (entities.size === 0) return;

        const same = entities.size === this.selectedEntities.size &&
            [...entities].every(e => this.selectedEntities.has(e));
        if (same) return;

        this.deselectAll();
        this.selectedEntities = new Set(entities);

        this.emit(ControllerEvents.SELECTED_OBJECTS, this.selectedEntities, this.isResizable());
    }

    /** Returns true when exactly one resizable entity is selected (resize handles should be shown). */
    isResizable(): boolean {
        if (this.selectedEntities.size !== 1) return false;
        return this.selectedEntities.values().next().value!.isResizable;
    }

    deselectAll(): void {
        if (this.selectedEntities.size === 0) return;
        this.selectedEntities.clear();
        this.emit(ControllerEvents.DESELECTED_ALL);
    }

    getSelectedEntities(): Set<GameEntity> {
        return this.selectedEntities;
    }

    destroy(): void {
        this.scene.input.off('pointerdown', this.onPointerDown, this);
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
        this.removeAllListeners();
    }

    // -----------------------------------------------------------------------
    // Box-select helpers
    // -----------------------------------------------------------------------

    private updateSelectRect(curX: number, curY: number): void {
        const x = Math.min(this.startX, curX);
        const y = Math.min(this.startY, curY);
        let w = Math.abs(curX - this.startX) + TILE_SIZE;
        let h = Math.abs(curY - this.startY) + TILE_SIZE;
        this.selectRect.setTo(x, y, w, h);

        // Emit current rect shape so SelectionView can draw the rubber band.
        this.emit(ControllerEvents.SELECTION_DRAG_ENDED, this.selectRect); // reused event for rect update
    }

    /**
     * Checks which entities intersect the rubber-band rectangle.
     * Uses the frame-key technique (scan the perimeter tiles) for efficiency.
     */
    private sweepFrame(): void {
        const rect = this.selectRect;
        const frameKeys = this.getFrameKeys(rect);

        // Add newly-entered entities.
        for (const key of frameKeys) {
            const entity = this.entityManager['tileMap'].get(key); // private access
            if (entity) {
                this.currHighlightedFrame.add(entity);
                this.highlighted.add(entity);
            }
        }

        // Remove entities that no longer intersect the rect.
        const entityRect = new Phaser.Geom.Rectangle();
        this.highlighted.forEach(entity => {
            entityRect.setTo(entity.x, entity.y, entity.width, entity.height);
            if (!Phaser.Geom.Intersects.RectangleToRectangle(entityRect, rect)) {
                this.highlighted.delete(entity);
            }
        });

        this.currHighlightedFrame.clear();
    }

    /** Returns the tile position keys on the perimeter of `rect`. */
    private getFrameKeys(rect: Phaser.Geom.Rectangle): string[] {
        const keys: string[] = [];
        // Top and bottom rows.
        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            keys.push(GridManager.getPositionKeyXY(x, rect.y));
            keys.push(GridManager.getPositionKeyXY(x, rect.y + rect.height - TILE_SIZE));
        }
        // Left and right columns (excluding corners already added).
        for (let y = rect.y + TILE_SIZE; y < rect.y + rect.height - TILE_SIZE; y += TILE_SIZE) {
            keys.push(GridManager.getPositionKeyXY(rect.x, y));
            keys.push(GridManager.getPositionKeyXY(rect.x + rect.width - TILE_SIZE, y));
        }
        return keys;
    }
}
