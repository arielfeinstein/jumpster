/**
 * ResizeController.ts
 *
 * Generic resize controller that works with any resizable entity.
 * Which handles to show and how to validate are driven by a ResizeConfig
 * looked up from EntityRegistry — the controller itself is entity-agnostic.
 *
 * Handles are created for all eight directions at construction time, but
 * only the subset specified by the active config are shown and enabled.
 */

import Phaser from 'phaser';
import GameEntity from '../../../gameObjects/GameEntity';
import EntityManager from '../managers/EntityManager';
import PlatformRelationshipManager from '../managers/PlatformRelationshipManager';
import CommandHistory from '../commands/CommandHistory';
import ResizeCommand from '../commands/ResizeCommand';
import EntityRegistry from '../registry/EntityRegistry';
import ControllerEvents from '../utils/ControllerEvents';
import { CardinalDir, RED_TINT, Rect, ResizeConfig, depthConfig } from '../types/EditorTypes';
import { handleResizeConfig } from '../views/SelectionView';
import GridManager from '../managers/GridManager';
import { TILE_SIZE } from '../../../config';

// ---------------------------------------------------------------------------
// Resize strategy type
// ---------------------------------------------------------------------------

/**
 * Given the snapped pointer position and the entity's rect at drag-start,
 * returns the new Rect, or `null` when the geometry is invalid
 * (e.g. pointer has crossed to the wrong side — the entity should hide).
 */
type ResizeStrategy = (snapped: Phaser.Math.Vector2, orig: Rect) => Rect | null;

// ---------------------------------------------------------------------------
// Directional strategies (pure functions, defined once)
// ---------------------------------------------------------------------------

const resizeStrategies: Record<CardinalDir, ResizeStrategy> = {
    nw: (s, o) =>
        s.x < o.x + o.width && s.y < o.y + o.height
            ? { x: s.x, y: s.y, width: o.x + o.width - s.x, height: o.y + o.height - s.y }
            : null,

    n: (s, o) =>
        s.y < o.y + o.height
            ? { x: o.x, y: s.y, width: o.width, height: o.y + o.height - s.y }
            : null,

    ne: (s, o) =>
        s.x >= o.x && s.y < o.y + o.height
            ? { x: o.x, y: s.y, width: s.x - o.x + TILE_SIZE, height: o.y + o.height - s.y }
            : null,

    w: (s, o) =>
        s.x < o.x + o.width
            ? { x: s.x, y: o.y, width: o.x + o.width - s.x, height: o.height }
            : null,

    e: (s, o) =>
        s.x >= o.x
            ? { x: o.x, y: o.y, width: s.x - o.x + TILE_SIZE, height: o.height }
            : null,

    sw: (s, o) =>
        s.x < o.x + o.width && s.y >= o.y
            ? { x: s.x, y: o.y, width: o.x + o.width - s.x, height: s.y - o.y + TILE_SIZE }
            : null,

    s: (s, o) =>
        s.y >= o.y
            ? { x: o.x, y: o.y, width: o.width, height: s.y - o.y + TILE_SIZE }
            : null,

    se: (s, o) =>
        s.x >= o.x && s.y >= o.y
            ? { x: o.x, y: o.y, width: s.x - o.x + TILE_SIZE, height: s.y - o.y + TILE_SIZE }
            : null,
};

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export default class ResizeController extends Phaser.Events.EventEmitter {

    readonly sizingHandles: Map<CardinalDir, Phaser.GameObjects.Graphics>;

    private entity: GameEntity | null = null;
    private config: ResizeConfig | null = null;
    private currentDir: CardinalDir | null = null;

    /** Rect at the moment the drag started (before any resize). */
    private fromRect: Rect = { x: 0, y: 0, width: 0, height: 0 };

    /** Set to true during drag when the current geometry is invalid. */
    private dragInvalid = false;

    private readonly snappedPointer = new Phaser.Math.Vector2();
    private readonly entityManager: EntityManager;
    private readonly relManager: PlatformRelationshipManager;
    private readonly history: CommandHistory;

    constructor(
        scene: Phaser.Scene,
        entityManager: EntityManager,
        relManager: PlatformRelationshipManager,
        history: CommandHistory,
    ) {
        super();
        this.entityManager = entityManager;
        this.relManager = relManager;
        this.history = history;
        this.sizingHandles = this.createHandles(scene);
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Called by the editor when a single resizable entity is selected.
     * Looks up the entity's ResizeConfig to determine which handles to use.
     */
    setEntity(entity: GameEntity): void {
        this.removeDragListeners();
        this.entity = entity;
        this.config = EntityRegistry.getResizeConfig(entity.entityType) ?? null;
        this.addDragListeners();
    }

    /**
     * Returns the set of cardinal directions that should be shown for
     * the currently active entity, or all 8 if no config is loaded.
     */
    getActiveDirections(): CardinalDir[] {
        return this.config?.directions ?? [];
    }

    addDragListeners(): void {
        if (!this.entity || !this.config) return;
        const activeSet = new Set(this.config.directions);

        for (const [dir, handle] of this.sizingHandles) {
            if (!activeSet.has(dir)) continue;
            handle.on('dragstart', (_p: Phaser.Input.Pointer, _dx: number, _dy: number) => {
                this.onDragStart(dir);
            });
            handle.on('drag', this.onDrag, this);
            handle.on('dragend', this.onDragEnd, this);
        }
    }

    removeDragListeners(): void {
        for (const handle of this.sizingHandles.values()) {
            handle.removeAllListeners('dragstart');
            handle.removeAllListeners('drag');
            handle.removeAllListeners('dragend');
        }
    }

    destroy(): void {
        this.removeDragListeners();
        this.removeAllListeners();
    }

    // -----------------------------------------------------------------------
    // Drag handlers
    // -----------------------------------------------------------------------

    private onDragStart(dir: CardinalDir): void {
        if (!this.entity) return;
        this.currentDir = dir;
        this.dragInvalid = false;

        // Snapshot the entity's rect before any modification.
        this.fromRect = {
            x: this.entity.x,
            y: this.entity.y,
            width: this.entity.width,
            height: this.entity.height,
        };

        // Temporarily remove from grid so overlap checks don't self-block.
        this.entityManager.removeEntity(this.entity);
        this.relManager.onEntityRemoved(this.entity);

        this.entity.setAlpha(0.5);
        this.emit(ControllerEvents.RESIZE_STARTED, this.entity);
    }

    private onDrag(pointer: Phaser.Input.Pointer): void {
        if (!this.entity || !this.currentDir || !this.config) return;

        this.snappedPointer.set(pointer.worldX, pointer.worldY);
        GridManager.updateToSnappedCoord(this.snappedPointer);

        const newRect = resizeStrategies[this.currentDir](this.snappedPointer, this.fromRect);

        if (!newRect) {
            this.entity.setVisible(false);
            return;
        }

        // Apply tentative geometry.
        this.entity.x = newRect.x;
        this.entity.y = newRect.y;
        this.entity.resize(newRect.width, newRect.height);
        this.entity.setVisible(true);

        // Validate using the entity-type-specific config callback.
        if (!this.config.validate(this.entity, this.fromRect, this.entityManager)) {
            this.entity.setTint(RED_TINT);
            this.dragInvalid = true;
        } else {
            this.entity.clearTint();
            this.dragInvalid = false;
        }
    }

    private onDragEnd(): void {
        if (!this.entity) return;

        const invalid = !this.entity.displayObject.visible || this.dragInvalid;

        // Always restore visibility and tint first.
        this.entity.setVisible(true).setAlpha(1).clearTint();

        if (invalid) {
            // Restore original geometry.
            this.entity.x = this.fromRect.x;
            this.entity.y = this.fromRect.y;
            this.entity.resize(this.fromRect.width, this.fromRect.height);
        }

        // Capture to-rect now (after possible restore).
        const toRect: Rect = {
            x: this.entity.x,
            y: this.entity.y,
            width: this.entity.width,
            height: this.entity.height,
        };

        if (!invalid) {
            // Execute as a command (re-registers in grid + rebuilds relationships).
            const cmd = new ResizeCommand(
                this.entity,
                this.fromRect,
                toRect,
                this.entityManager,
                this.relManager,
            );
            this.history.executeCommand(cmd);
        } else {
            // Cancelled — just re-register at original position.
            this.entityManager.addEntity(this.entity);
            this.relManager.onEntityPlaced(this.entity);
        }

        this.currentDir = null;
        this.emit(ControllerEvents.RESIZE_ENDED, this.entity);
    }

    // -----------------------------------------------------------------------
    // Handle creation
    // -----------------------------------------------------------------------

    private createHandles(scene: Phaser.Scene): Map<CardinalDir, Phaser.GameObjects.Graphics> {
        const dirs: CardinalDir[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        const handles = new Map<CardinalDir, Phaser.GameObjects.Graphics>();

        for (const dir of dirs) {
            const handle = scene.add
                .graphics()
                .setDepth(depthConfig.SIZING_HANDLES)
                .setVisible(false);

            handle.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(0, 0, handleResizeConfig.SIZE, handleResizeConfig.SIZE),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                draggable: true,
            });

            handle.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation();
            });

            handle.disableInteractive();
            handles.set(dir, handle);
        }

        return handles;
    }
}
