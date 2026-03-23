/**
 * Editor.ts
 *
 * Thin scene orchestrator for the level editor.
 *
 * Responsibilities:
 *   - Create background, grid, and camera bounds.
 *   - Instantiate and wire all systems: managers, commands, controllers, views.
 *   - Handle EventBus events from the React UI (place entity, change dimensions).
 *   - Register Ctrl+Z / Ctrl+Y keyboard shortcuts for undo / redo.
 *   - Call CameraController.update() each frame.
 *   - Tear everything down on scene shutdown.
 *
 * This file intentionally contains no game logic — all logic lives in the
 * controllers, managers, and commands it wires together.
 */

import { Scene } from 'phaser';
import Phaser from 'phaser';
import { EventBus } from '../../EventBus';
import { TILE_SIZE } from '../../config';

// Managers
import EntityManager from './managers/EntityManager';
import PlatformRelationshipManager from './managers/PlatformRelationshipManager';
// Commands
import CommandHistory from './commands/CommandHistory';
import DeleteCommand from './commands/DeleteCommand';

// Controllers
import CameraController from './controllers/CameraController';
import SelectionController from './controllers/SelectionController';
import DragController from './controllers/DragController';
import PlacementController from './controllers/PlacementController';
import PlatformResizeController from './controllers/PlatformResizeController';

// Views
import SelectionView from './views/SelectionView';
import DeleteButtonView from './views/DeleteButtonView';

// Types
import GameEntity from '../../gameObjects/GameEntity';
import Platform from '../../gameObjects/Platform';
import ControllerEvents from './utils/ControllerEvents';
import { calcBoundingBox } from './utils/GeometryUtils';
import { depthConfig } from './types/EditorTypes';

export class Editor extends Scene {

    // -----------------------------------------------------------------------
    // Systems
    // -----------------------------------------------------------------------

    private entityManager!: EntityManager;
    private relManager!: PlatformRelationshipManager;
    private history!: CommandHistory;

    private cameraController!: CameraController;
    private selectionController!: SelectionController;
    private dragController!: DragController;
    private placementController!: PlacementController;
    private resizeController!: PlatformResizeController;

    private selectionView!: SelectionView;
    private deleteButtonView!: DeleteButtonView;
    private deleteButton!: Phaser.GameObjects.Image;

    // -----------------------------------------------------------------------
    // World state
    // -----------------------------------------------------------------------

    /** Number of viewport-width units the world spans (saved for serialisation). */
    worldWidthUnit = 1;
    /** Number of viewport-height units the world spans (saved for serialisation). */
    worldHeightUnit = 1;

    private grid!: Phaser.GameObjects.Grid;

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    constructor() {
        super('Editor');
    }

    create(): void {
        const vw = this.scale.width;
        const vh = this.scale.height;

        // Background (scroll-fixed, behind everything).
        this.add
            .image(0, 0, 'background')
            .setOrigin(0, 0)
            .setDisplaySize(vw, vh)
            .setScrollFactor(0)
            .setDepth(-10);

        // Grid overlay.
        this.grid = this.add
            .grid(0, 0, this.canvasWidth(), this.canvasHeight(), TILE_SIZE, TILE_SIZE)
            .setOrigin(0, 0);
        this.grid.setOutlineStyle(0x000000, 1);

        // Camera and physics bounds.
        this.cameras.main.setBounds(0, 0, this.canvasWidth(), this.canvasHeight());
        this.physics.world.setBounds(0, 0, this.canvasWidth(), this.canvasHeight());

        // Drag distance threshold (prevents micro-drags from triggering moves).
        this.input.dragDistanceThreshold = 16;

        // ---- Systems ----
        this.entityManager = new EntityManager();
        this.relManager = new PlatformRelationshipManager(this.entityManager);
        this.history = new CommandHistory();

        // Interactivity setup is called whenever EntityManager registers a new entity.
        this.entityManager.onEntityAdded = (entity) => this.setupEntityInteractivity(entity);

        this.cameraController = new CameraController(this);

        this.dragController = new DragController(
            this,
            this.entityManager,
            this.relManager,
            this.history,
        );

        this.selectionController = new SelectionController(this, this.entityManager);

        this.placementController = new PlacementController(
            this,
            this.entityManager,
            this.relManager,
            this.history,
        );

        // ---- Views ----
        this.selectionView = new SelectionView(this);
        this.deleteButtonView = new DeleteButtonView();

        this.deleteButton = this.add
            .image(0, 0, 'red-cross')
            .setOrigin(0, 0)
            .setDepth(depthConfig.DELETE_BUTTON)
            .setVisible(false);

        // ---- Resize controller (needs delete button depth ref) ----
        this.resizeController = new PlatformResizeController(
            this,
            this.entityManager,
            this.relManager,
            this.history,
        );

        // ---- Wire events ----
        this.wireEvents();

        EventBus.emit('current-scene-ready', this);
    }

    update(): void {
        this.cameraController.update();
    }

    // -----------------------------------------------------------------------
    // Entity interactivity
    // -----------------------------------------------------------------------

    /**
     * Called by EntityManager.onEntityAdded for every entity that enters the level.
     * Sets up pointer and drag events on the entity's display object so the editor
     * can select and move it.
     */
    private setupEntityInteractivity(entity: GameEntity): void {
        const obj = entity.displayObject;

        // Platforms set their own interactive hit area in the constructor.
        // All other entities need it set up here.
        if (!(entity instanceof Platform)) {
            obj.setInteractive({ draggable: true });
        }

        obj.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
            // During placement mode let the click fall through to the scene so
            // PlacementController can handle it.
            if (this.placementController.isPlacing) return;
            this.selectionController.selectEntities(new Set([entity]));
            this.selectionController.disableSelectDrag = true;
            event.stopPropagation();
        });

        obj.on('dragstart', () => {
            // Don't start a move-drag while the user is placing a new entity.
            if (this.placementController.isPlacing) return;
            const selected = this.selectionController.getSelectedEntities();
            // If the entity is part of the selection, drag all selected; otherwise just this one.
            const toDrag = selected.has(entity)
                ? [...selected]
                : [entity];
            this.dragController.startMoveDrag(toDrag);
        });
    }

    // -----------------------------------------------------------------------
    // Event wiring
    // -----------------------------------------------------------------------

    private wireEvents(): void {
        // React UI → Phaser.
        EventBus.on('editor-start-placement', this.placementController.startPlacement, this.placementController);
        EventBus.on('editor-cancel-placement', this.placementController.cancelPlacement, this.placementController);
        EventBus.on('editor-change-dimensions', this.changeDimensions, this);

        // Delete button.
        this.deleteButton.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
            this.handleDelete();
            event.stopPropagation();
        });

        // Selection events → update views.
        this.selectionController.on(
            ControllerEvents.SELECTED_OBJECTS,
            (entities: Set<GameEntity>, resizeHandlesNeeded: boolean) => {
                this.selectionView.clearSelectionBox();
                this.selectionView.clearSelectionOutlines();

                const entityArray = [...entities];
                const bbox = calcBoundingBox(entityArray.map(e => ({ x: e.x, y: e.y, width: e.width, height: e.height })));

                this.selectionView.drawSelectionOutline(bbox);
                this.deleteButtonView.show(bbox, this.cameras.main, this.deleteButton);

                if (resizeHandlesNeeded) {
                    const platform = entityArray[0] as Platform;
                    this.selectionView.drawSizingHandles(bbox, this.resizeController.sizingHandles);
                    this.resizeController.setPlatform(platform);
                    this.enableResizeHandles(true);
                }
            },
        );

        this.selectionController.on(ControllerEvents.DESELECTED_ALL, () => {
            this.selectionView.clearSelectionBox();
            this.selectionView.clearSelectionOutlines();
            this.deleteButtonView.hide(this.deleteButton);
            this.selectionView.clearSizingHandles(this.resizeController.sizingHandles);
            this.enableResizeHandles(false);
            this.resizeController.removeDragListeners();
        });

        this.selectionController.on(
            ControllerEvents.HIGHLITED_OBJS_UPDATED,
            (highlighted: Set<GameEntity>) => {
                const rects = [...highlighted].map(e => ({ x: e.x, y: e.y, width: e.width, height: e.height }));
                this.selectionView.drawSelectionOutlines(rects);
            },
        );

        this.selectionController.on(ControllerEvents.SELECTION_DRAG_ENDED, (rect?: { x: number; y: number; width: number; height: number }) => {
            if (rect) {
                this.selectionView.drawSelectionBox(rect);
            } else {
                this.selectionView.clearSelectionBox();
            }
        });

        // Resize controller events.
        this.resizeController.on(ControllerEvents.PLATFORM_RESIZE_CLICKED, () => {
            this.selectionController.disableSelectDrag = true;
        });

        this.resizeController.on(ControllerEvents.PLATFORM_RESIZE_ENDED, (platform: Platform) => {
            this.selectionController.deselectAll();
            this.selectionController.selectEntities(new Set([platform]));
        });

        // Keyboard shortcuts.
        this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            // Escape cancels an active entity placement.
            if (event.key === 'Escape') {
                this.placementController.cancelPlacement();
                return;
            }

            if (!event.ctrlKey && !event.metaKey) return;

            if (event.key === 'z' || event.key === 'Z') {
                if (event.shiftKey) {
                    this.history.redo();
                } else {
                    this.history.undo();
                }
            } else if (event.key === 'y' || event.key === 'Y') {
                this.history.redo();
            }
        });

        // Scene shutdown cleanup.
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('editor-start-placement');
            EventBus.off('editor-cancel-placement');
            EventBus.off('editor-change-dimensions');
            this.placementController.destroy();
            this.selectionController.destroy();
            this.dragController.destroy();
            this.resizeController.destroy();
            this.history.clear();
        });
    }

    // -----------------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------------

    private handleDelete(): void {
        const selected = [...this.selectionController.getSelectedEntities()];
        if (selected.length === 0) return;

        if (!this.relManager.canDeleteEntities(selected)) return;

        const cmd = new DeleteCommand(this, selected, this.entityManager, this.relManager);
        this.history.executeCommand(cmd);

        this.selectionController.deselectAll();
        this.deleteButtonView.hide(this.deleteButton);
    }

    // -----------------------------------------------------------------------
    // Dimensions
    // -----------------------------------------------------------------------

    private changeDimensions({ worldWidthUnit, worldHeightUnit }: { worldWidthUnit: number; worldHeightUnit: number }): void {
        if (worldWidthUnit <= 0 || worldHeightUnit <= 0) return;

        this.worldWidthUnit  = worldWidthUnit;
        this.worldHeightUnit = worldHeightUnit;

        const width = this.canvasWidth() * worldWidthUnit;
        const height = this.canvasHeight() * worldHeightUnit;

        this.cameras.main.setBounds(0, 0, width, height);
        this.physics.world.setBounds(0, 0, width, height);
        this.grid.width = width;
        this.grid.height = height;
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private canvasWidth(): number { return this.scale.width; }
    private canvasHeight(): number { return this.scale.height; }

    private enableResizeHandles(enable: boolean): void {
        for (const handle of this.resizeController.sizingHandles.values()) {
            if (enable) handle.setInteractive();
            else handle.disableInteractive();
        }
    }
}
