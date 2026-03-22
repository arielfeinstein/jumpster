/**
 * PlacementController.ts
 *
 * Lean placement handler.  Responsibilities:
 *   1. Receive a placement request from the React palette (via EventBus).
 *   2. Snap the drop coordinates to the grid.
 *   3. Create a ghost entity via EntityRegistry (alpha 0.5).
 *   4. Hand the ghost to DragController so the user can reposition it before
 *      confirming placement.
 *
 * Validation (overlap, singleton, platform-below) is handled by DragController
 * using EntityManager.canPlace() — no logic duplication here.
 */

import Phaser from 'phaser';
import GameEntity from '../../../gameObjects/GameEntity';
import EntityRegistry from '../registry/EntityRegistry';
import DragController from './DragController';
import GridManager from '../managers/GridManager';
import { EntityType } from '../types/EditorTypes';

export interface PlacementRequest {
    entityType: EntityType;
    x: number;
    y: number;
}

export default class PlacementController {

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly dragController: DragController,
    ) {}

    /**
     * Called when the user drops an entity from the React palette onto the canvas.
     * `x` and `y` are world-space coordinates from the drop event.
     */
    initPlacement = ({ entityType, x, y }: PlacementRequest): void => {
        // Prevent any pending pointer-down from immediately triggering box-select.
        this.scene.input.activePointer.isDown = false;

        const snapped = GridManager.snapXY(x, y);

        // Create ghost entity — not yet registered in EntityManager.
        const ghost = EntityRegistry.create(entityType, this.scene, snapped.x, snapped.y);
        ghost.setAlpha(0.5);

        // Hand off to DragController — it validates and executes PlaceCommand on drop.
        this.dragController.startPlaceDrag(ghost);
    };
}
