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
import BackgroundManager from './managers/BackgroundManager';
// Commands
import CommandHistory from './commands/CommandHistory';
import DeleteCommand from './commands/DeleteCommand';
import SetBackgroundCommand from './commands/SetBackgroundCommand';

import WorldManager from './managers/WorldManager';

// Controllers
import CameraController from './controllers/CameraController';
import SelectionController from './controllers/SelectionController';
import DragController from './controllers/DragController';
import PlacementController from './controllers/PlacementController';
import ResizeController from './controllers/ResizeController';

// Views
import SelectionView from './views/SelectionView';
import DeleteButtonView from './views/DeleteButtonView';

// Types
import GameEntity from '../../shared/gameObjects/GameEntity';
import ControllerEvents from './utils/ControllerEvents';
import { calcBoundingBox } from './utils/GeometryUtils';
import { BackgroundKey } from '../../shared/types/BackgroundKey';
import { depthConfig } from './types/EditorTypes';
import LevelSerializer from '../../shared/serialization/LevelSerializer';

export class Editor extends Scene {

    // -----------------------------------------------------------------------
    // Systems
    // -----------------------------------------------------------------------

    private entityManager!: EntityManager;
    private relManager!: PlatformRelationshipManager;
    private history!: CommandHistory;
    private backgroundManager!: BackgroundManager;
    private worldManager!: WorldManager;

    private cameraController!: CameraController;
    private selectionController!: SelectionController;
    private dragController!: DragController;
    private placementController!: PlacementController;
    private resizeController!: ResizeController;

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
        // Background (scroll-fixed, behind everything).
        this.backgroundManager = new BackgroundManager(this);

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
        this.worldManager = new WorldManager(
            this,
            this.entityManager,
            this.relManager,
            this.history,
            (wUnits, hUnits) => {
                this.worldWidthUnit = wUnits;
                this.worldHeightUnit = hUnits;
                
                const width = this.canvasWidth() * wUnits;
                const height = this.canvasHeight() * hUnits;

                this.cameras.main.setBounds(0, 0, width, height);
                this.physics.world.setBounds(0, 0, width, height);
                this.grid.width = width;
                this.grid.height = height;
            },
            () => ({ w: this.worldWidthUnit, h: this.worldHeightUnit })
        );

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
        this.resizeController = new ResizeController(
            this,
            this.entityManager,
            this.relManager,
            this.history,
        );

        // ---- Wire events ----
        this.wireSelectionZoneEvents();
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

        obj.setInteractive(entity.getEditorInteractiveConfig());

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

    /**
     * Wires the selection zone's pointer events once at scene creation.
     * The zone is a transparent interactive rectangle that sits over the
     * selection outline. It prevents two multi-drag bugs:
     *   1. Clicking empty space inside the outline accidentally starts a box-select.
     *   2. Clicking a selected entity overwrites the multi-selection with just that entity.
     * Both are solved because the zone (higher depth than entities) intercepts
     * all pointer events within the bounding box while a selection is active.
     */
    private wireSelectionZoneEvents(): void {
        const zone = this.selectionView.selectionZone;

        zone.on('pointerdown', (
            _p: Phaser.Input.Pointer,
            _lx: number,
            _ly: number,
            event: Phaser.Types.Input.EventData,
        ) => {
            if (this.placementController.isPlacing) return;
            this.selectionController.disableSelectDrag = true;
            event.stopPropagation();
        });

        zone.on('dragstart', () => {
            if (this.placementController.isPlacing) return;
            this.dragController.startMoveDrag([...this.selectionController.getSelectedEntities()]);
        });
    }

    private wireEvents(): void {
        // React UI → Phaser.
        EventBus.on('editor-start-placement', this.placementController.startPlacement, this.placementController);
        EventBus.on('editor-cancel-placement', this.placementController.cancelPlacement, this.placementController);
        EventBus.on('editor-change-dimensions', this.worldManager.handleChangeDimensions, this.worldManager);
        EventBus.on('editor-set-background', this.handleSetBackground, this);
        EventBus.on('editor-undo', () => this.history.undo());
        EventBus.on('editor-redo', () => this.history.redo());
        EventBus.on('editor-save-level', ({ name }: { name: string }) => {
            const data = LevelSerializer.serialize(
                this.entityManager,
                this.worldWidthUnit,
                this.worldHeightUnit,
                name,
                this.backgroundManager.currentKey,
            );
            EventBus.emit('editor-level-saved', data);
        });

        // Delete button.
        this.deleteButton.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
            this.handleDelete();
            event.stopPropagation();
        });

        // Selection events → update views.
        this.selectionController.on(
            ControllerEvents.SELECTED_OBJECTS,
            (entities: Set<GameEntity>, resizeHandlesNeeded: boolean) => {
                this.showSelectionDecorations(entities);
                if (resizeHandlesNeeded) {
                    this.setupResizeHandles([...entities][0]);
                }
            },
        );

        this.selectionController.on(ControllerEvents.DESELECTED_ALL, () => {
            this.clearSelectionDecorations();
            this.teardownResizeHandles();
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
        this.resizeController.on(ControllerEvents.RESIZE_STARTED, () => {
            this.selectionController.disableSelectDrag = true;
            this.clearSelectionDecorations();
        });

        this.resizeController.on(ControllerEvents.RESIZE_ENDED, () => {
            this.selectionController.disableSelectDrag = false;
            this.refreshSelectionDisplay();
        });

        // Drag controller events.
        this.dragController.on(ControllerEvents.DRAG_STARTED, () => {
            this.clearSelectionDecorations();
            this.teardownResizeHandles();
        });

        this.dragController.on(ControllerEvents.DRAG_ENDED, () => {
            this.refreshSelectionDisplay();
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
            EventBus.off('editor-set-background');
            EventBus.off('editor-save-level');
            EventBus.off('editor-level-saved');
            this.backgroundManager.destroy();
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

    private async handleDelete(): Promise<void> {
        const selected = [...this.selectionController.getSelectedEntities()];
        if (selected.length === 0) return;

        const stranded = this.relManager.getStrandedEntities(selected);

        if (stranded.length > 0) {
            const confirmed = await new Promise<boolean>((resolve) => {
                EventBus.emit('editor-confirm-dialog', {
                    message: 'Deleting will also remove entities that require platform support. Are you sure you want to continue?',
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false),
                });
            });

            if (!confirmed) return;
            selected.push(...stranded);
        }

        const cmd = new DeleteCommand(this, selected, this.entityManager, this.relManager);
        this.history.executeCommand(cmd);

        this.selectionController.deselectAll();
    }

    // -----------------------------------------------------------------------
    // Background
    // -----------------------------------------------------------------------

    private handleSetBackground(key: BackgroundKey): void {
        if (key === this.backgroundManager.currentKey) return;
        const cmd = new SetBackgroundCommand(this.backgroundManager, this.backgroundManager.currentKey, key);
        this.history.executeCommand(cmd);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private canvasWidth(): number { return this.scale.width; }
    private canvasHeight(): number { return this.scale.height; }

    // -----------------------------------------------------------------------
    // Selection controls — granular show / clear
    // -----------------------------------------------------------------------

    /** Draws the selection outline around the given entities and shows the delete button. */
    private showSelectionDecorations(entities: Set<GameEntity>): void {
        this.selectionView.clearSelectionBox();
        this.selectionView.clearSelectionOutlines();

        const bbox = calcBoundingBox([...entities].map(e => ({ x: e.x, y: e.y, width: e.width, height: e.height })));
        this.selectionView.drawSelectionOutline(bbox);
        this.selectionView.enableZone(bbox);
        this.deleteButtonView.show(bbox, this.cameras.main, this.deleteButton);
    }

    /** Hides the selection outline and delete button. */
    private clearSelectionDecorations(): void {
        this.selectionView.clearSelectionBox();
        this.selectionView.clearSelectionOutlines();
        this.selectionView.disableZone();
        this.deleteButtonView.hide(this.deleteButton);
    }

    /** Draws resize handles for the entity, registers drag listeners, and enables interactivity. */
    private setupResizeHandles(entity: GameEntity): void {
        const bbox = { x: entity.x, y: entity.y, width: entity.width, height: entity.height };
        this.resizeController.setEntity(entity);
        const activeDirections = new Set(this.resizeController.getActiveDirections());

        this.selectionView.drawSizingHandles(bbox, this.resizeController.sizingHandles, activeDirections);
        for (const [dir, handle] of this.resizeController.sizingHandles) {
            if (activeDirections.has(dir)) {
                handle.setInteractive();
            }
        }
    }

    /** Hides resize handles, disables interactivity, and removes drag listeners. */
    private teardownResizeHandles(): void {
        this.selectionView.clearSizingHandles(this.resizeController.sizingHandles);
        for (const handle of this.resizeController.sizingHandles.values()) {
            handle.disableInteractive();
        }
        this.resizeController.removeDragListeners();
    }

    /**
     * Re-displays selection controls for whatever is currently selected.
     * Used after drag/resize ends to restore the display from the current selection state.
     */
    private refreshSelectionDisplay(): void {
        const entities = this.selectionController.getSelectedEntities();
        if (entities.size === 0) return;

        this.showSelectionDecorations(entities);
        if (this.selectionController.isResizable()) {
            this.setupResizeHandles([...entities][0]);
        }
    }
}
