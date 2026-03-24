/**
 * PlatformResizeController.ts
 *
 * Manages the eight resize handles for a selected platform and issues a
 * ResizeCommand when a valid resize drag completes.
 *
 * Key improvement: the 8-case `switch` for directional geometry is replaced
 * with a `Record<CardinalDir, ResizeStrategy>` where each strategy is a pure
 * function.  TypeScript enforces all eight keys exist at compile time.
 */

import Phaser from 'phaser';
import Platform from '../../../gameObjects/Platform';
import EntityManager from '../managers/EntityManager';
import PlatformRelationshipManager from '../managers/PlatformRelationshipManager';
import CommandHistory from '../commands/CommandHistory';
import ResizeCommand from '../commands/ResizeCommand';
import ControllerEvents from '../utils/ControllerEvents';
import { CardinalDir, RED_TINT, Rect, depthConfig } from '../types/EditorTypes';
import { handleResizeConfig } from '../views/SelectionView';
import GridManager from '../managers/GridManager';
import { TILE_SIZE } from '../../../config';

// ---------------------------------------------------------------------------
// Resize strategy type
// ---------------------------------------------------------------------------

/**
 * Given the snapped pointer position and the platform's rect at drag-start,
 * returns the new platform Rect, or `null` when the geometry is invalid
 * (e.g. pointer has crossed to the wrong side — the ghost should hide).
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

export default class PlatformResizeController extends Phaser.Events.EventEmitter {

    readonly sizingHandles: Map<CardinalDir, Phaser.GameObjects.Graphics>;

    private platform: Platform | null = null;
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

    /** Called by the editor when a single platform is selected. */
    setPlatform(platform: Platform): void {
        this.removeDragListeners();
        this.platform = platform;
        this.addDragListeners();
    }

    addDragListeners(): void {
        if (!this.platform) return;
        for (const [dir, handle] of this.sizingHandles) {
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
        if (!this.platform) return;
        this.currentDir = dir;
        this.dragInvalid = false;

        // Snapshot the platform's rect before any modification.
        this.fromRect = {
            x: this.platform.x,
            y: this.platform.y,
            width: this.platform.width,
            height: this.platform.height,
        };

        // Temporarily remove from grid so overlap checks don't self-block.
        this.entityManager.removeEntity(this.platform);
        this.relManager.onEntityRemoved(this.platform);

        this.platform.setAlpha(0.5);
        this.emit(ControllerEvents.PLATFORM_RESIZE_STARTED, this.platform);
    }

    private onDrag(pointer: Phaser.Input.Pointer): void {
        if (!this.platform || !this.currentDir) return;

        this.snappedPointer.set(pointer.worldX, pointer.worldY);
        GridManager.updateToSnappedCoord(this.snappedPointer);

        const newRect = resizeStrategies[this.currentDir](this.snappedPointer, this.fromRect);

        if (!newRect) {
            this.platform.setVisible(false);
            return;
        }

        // Apply tentative geometry.
        this.platform.x = newRect.x;
        this.platform.y = newRect.y;
        this.platform.resize(newRect.width, newRect.height);
        this.platform.setVisible(true);

        // Validate: no overlap AND objects above are not lost.
        const tempEntity = { ...newRect, id: this.platform.id, entityType: 'platform' as const, isSingleton: false, requiresPlatformBelow: false, isResizable: true, width: newRect.width, height: newRect.height } as never;
        const canPlace = this.entityManager.canPlace(this.platform);
        const aboveCount = this.entityManager.getEntitiesAbove(this.platform).size;
        const prevAboveCount = this.entityManager.getEntitiesAbove({ ...this.fromRect }).size;

        if (!canPlace || aboveCount < prevAboveCount) {
            this.platform.setTint(RED_TINT);
            this.dragInvalid = true;
        } else {
            this.platform.clearTint();
            this.dragInvalid = false;
        }
    }

    private onDragEnd(): void {
        if (!this.platform) return;

        const invalid = !this.platform.displayObject.visible || this.dragInvalid;

        // Always restore visibility and tint first.
        this.platform.setVisible(true).setAlpha(1).clearTint();

        if (invalid) {
            // Restore original geometry.
            this.platform.x = this.fromRect.x;
            this.platform.y = this.fromRect.y;
            this.platform.resize(this.fromRect.width, this.fromRect.height);
        }

        // Capture to-rect now (after possible restore).
        const toRect: Rect = {
            x: this.platform.x,
            y: this.platform.y,
            width: this.platform.width,
            height: this.platform.height,
        };

        if (!invalid) {
            // Execute as a command (re-registers in grid + rebuilds relationships).
            const cmd = new ResizeCommand(
                this.platform,
                this.fromRect,
                toRect,
                this.entityManager,
                this.relManager,
            );
            this.history.executeCommand(cmd);
        } else {
            // Cancelled — just re-register at original position.
            this.entityManager.addEntity(this.platform);
            this.relManager.onEntityPlaced(this.platform);
        }

        this.currentDir = null;
        this.emit(ControllerEvents.PLATFORM_RESIZE_ENDED, this.platform);
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
