/**
 * PlacementController.ts
 *
 * Owns the full click-to-place lifecycle for new entities.
 *
 * Flow:
 *   1. React emits 'editor-start-placement' when the user picks an entity from
 *      the dock dropdown.
 *   2. startPlacement() creates a ghost entity (alpha 0.5) that follows the
 *      pointer, snapped to the grid, with red-tint feedback when the position
 *      is invalid.
 *   3. A left-click on the canvas commits the ghost via PlaceCommand if the
 *      position is valid.  If the entity is not a singleton the ghost is
 *      recreated immediately for repeated placement; singletons exit placement
 *      mode after one placement.
 *   4. cancelPlacement() destroys the ghost and exits placement mode.  It is
 *      called by the Escape key handler, the dock cancel button, or
 *      startPlacement() when switching entity type mid-placement.
 *
 * This controller is entirely independent of DragController — entity movement
 * (drag-to-reposition) is still handled by DragController.
 */

import Phaser from 'phaser';
import GameEntity from '../../../gameObjects/GameEntity';
import EntityRegistry from '../registry/EntityRegistry';
import EntityManager from '../managers/EntityManager';
import PlatformRelationshipManager from '../managers/PlatformRelationshipManager';
import CommandHistory from '../commands/CommandHistory';
import PlaceCommand from '../commands/PlaceCommand';
import GridManager from '../managers/GridManager';
import { EventBus } from '../../../EventBus';
import { RED_TINT } from '../types/EditorTypes';
import { StartPlacementPayload, PlacementActivePayload } from '../types/DockTypes';
import { EntityType } from '../types/EditorTypes';

export default class PlacementController {

    /** True while a ghost is alive and following the pointer. */
    isPlacing = false;

    // -----------------------------------------------------------------------
    // Private state
    // -----------------------------------------------------------------------

    private ghost: GameEntity | null = null;
    private currentEntityType: EntityType | null = null;

    /** Whether the ghost's current position is valid for placement. */
    private isValid = false;

    // Bound handler references so we can remove them in cleanup.
    private readonly boundPointerMove: (p: Phaser.Input.Pointer) => void;
    private readonly boundPointerDown: (p: Phaser.Input.Pointer) => void;

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly entityManager: EntityManager,
        private readonly relManager: PlatformRelationshipManager,
        private readonly history: CommandHistory,
    ) {
        this.boundPointerMove = this.onPointerMove.bind(this);
        this.boundPointerDown = this.onPointerDown.bind(this);
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Enter placement mode for the given entity type.
     * If already placing a different entity, the current ghost is discarded
     * first so the user always gets the entity they most recently selected.
     */
    startPlacement = ({ entityType, variant }: StartPlacementPayload): void => {
        // Discard any in-progress ghost before starting a new one.
        if (this.isPlacing) {
            this.destroyGhost();
        }

        this.currentEntityType = entityType;
        void variant; // reserved for future texture variant support

        // Place the ghost at the pointer's current world position so it
        // appears under the cursor immediately.
        const ptr = this.scene.input.activePointer;
        const snapped = GridManager.snapXY(ptr.worldX, ptr.worldY);

        this.ghost = EntityRegistry.create(entityType, this.scene, snapped.x, snapped.y);
        this.ghost.setAlpha(0.5);

        // Validate the initial position.
        this.isValid = this.entityManager.canPlace(this.ghost);
        if (!this.isValid) this.ghost.setTint(RED_TINT);

        // Register scene-level pointer listeners.
        this.scene.input.on('pointermove', this.boundPointerMove);
        this.scene.input.on('pointerdown', this.boundPointerDown);

        this.isPlacing = true;
        this.notifyReact(true, entityType);
    };

    /**
     * Exit placement mode, destroying the current ghost if one exists.
     * Called by: Escape key, dock cancel button ('editor-cancel-placement'),
     * and internally after placing a singleton.
     */
    cancelPlacement = (): void => {
        if (!this.isPlacing) return;

        this.destroyGhost();
        this.exitPlacementMode();
    };

    /**
     * Remove all event listeners.  Called on scene shutdown.
     */
    destroy(): void {
        if (this.isPlacing) {
            this.destroyGhost();
        }
        this.scene.input.off('pointermove', this.boundPointerMove);
        this.scene.input.off('pointerdown', this.boundPointerDown);
    }

    // -----------------------------------------------------------------------
    // Pointer handlers
    // -----------------------------------------------------------------------

    /**
     * Move the ghost to the snapped pointer position and update validity tint.
     * No pointer.isDown check — the ghost follows the cursor freely.
     */
    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.ghost) return;

        const snapped = GridManager.snapXY(pointer.worldX, pointer.worldY);
        this.ghost.x = snapped.x;
        this.ghost.y = snapped.y;

        this.isValid = this.entityManager.canPlace(this.ghost);

        if (this.isValid) {
            this.ghost.clearTint();
        } else {
            this.ghost.setTint(RED_TINT);
        }
    }

    /**
     * On a left-click: commit the ghost if valid, otherwise do nothing (ghost
     * stays visible with red tint so the user knows why placement failed).
     */
    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.ghost) return;

        // Only react to left-clicks so middle/right-click camera panning is unaffected.
        if (pointer.button !== 0) return;

        if (!this.isValid) return;

        // Capture state before the command mutates the ghost.
        const placedEntityType = this.currentEntityType!;
        const isSingleton = this.ghost.isSingleton;
        const lastX = this.ghost.x;
        const lastY = this.ghost.y;

        // Execute the placement command — this makes the ghost fully opaque
        // and registers it in EntityManager + relManager.
        const cmd = new PlaceCommand(this.scene, [this.ghost], this.entityManager, this.relManager);
        this.history.executeCommand(cmd);

        // The ghost is now a real entity in the world.  Clear our reference.
        this.ghost = null;

        if (isSingleton) {
            // Singletons can only be placed once — exit placement mode.
            this.exitPlacementMode();
        } else {
            // Non-singletons: immediately create a new ghost at the same
            // position so the user can keep placing without re-clicking the dock.
            const snapped = GridManager.snapXY(lastX, lastY);
            this.ghost = EntityRegistry.create(placedEntityType, this.scene, snapped.x, snapped.y);
            this.ghost.setAlpha(0.5);

            // Re-validate for the new position (another entity was just placed there,
            // so the new ghost is likely invalid until the pointer moves).
            this.isValid = this.entityManager.canPlace(this.ghost);
            if (!this.isValid) this.ghost.setTint(RED_TINT);
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Destroy the ghost display object and clear the reference. */
    private destroyGhost(): void {
        if (this.ghost) {
            this.ghost.destroy();
            this.ghost = null;
        }
    }

    /**
     * Unregister pointer listeners, reset state flags, and tell React
     * that placement mode is no longer active.
     */
    private exitPlacementMode(): void {
        this.scene.input.off('pointermove', this.boundPointerMove);
        this.scene.input.off('pointerdown', this.boundPointerDown);
        this.isPlacing = false;
        this.currentEntityType = null;
        this.notifyReact(false);
    }

    /** Emit placement state to React so the dock can show/hide the cancel button. */
    private notifyReact(active: boolean, entityType?: string): void {
        const payload: PlacementActivePayload = {
            active,
            ...(entityType ? { entityType: entityType as PlacementActivePayload['entityType'] } : {}),
        };
        EventBus.emit('editor-placement-active', payload);
    }
}
