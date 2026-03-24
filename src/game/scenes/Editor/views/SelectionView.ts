/**
 * SelectionView.ts
 *
 * Renders all selection-related visuals:
 *   - Rubber-band box drawn during a box-select drag.
 *   - Yellow outline(s) around selected / highlighted entities.
 *   - Eight resize handles for single-platform selection.
 *
 * This version eliminates the duplicate getViewportEdgeAlignment() that existed
 * in both the old SelectionView and Editor.ts — it delegates to GeometryUtils.
 */

import Phaser from 'phaser';
import { CardinalDir, Rect, depthConfig } from '../types/EditorTypes';
import { TILE_SIZE } from '../../../config';

// ---------------------------------------------------------------------------
// Visual config
// ---------------------------------------------------------------------------

const selectionBoxConfig = {
    LINE_COLOR: 0x808080,
    FILL_COLOR: 0x808080,
    LINE_ALPHA: 1,
    FILL_ALPHA: 0.15,
} as const;

const selectionOutlineConfig = {
    LINE_COLOR: 0xffff00,
    ALPHA: 1,
    THICKNESS: 2,
} as const;

export const handleResizeConfig = {
    SIZE: 6,
    OFFSET: 3,
} as const;

// ---------------------------------------------------------------------------
// SelectionView
// ---------------------------------------------------------------------------

export default class SelectionView {

    private readonly scene: Phaser.Scene;
    private readonly outlineGraphics: Phaser.GameObjects.Graphics;
    private readonly selectionBoxGraphics: Phaser.GameObjects.Graphics;

    /**
     * Transparent interactive zone that sits over the selection outline.
     * Activated by enableZone() so it can intercept pointer events within the
     * bounding box, preventing accidental deselection or box-select from
     * starting on empty space inside the selection.
     * Editor.ts wires its pointerdown / dragstart handlers once at scene creation.
     */
    readonly selectionZone: Phaser.GameObjects.Zone;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.outlineGraphics = scene.add.graphics();
        this.selectionBoxGraphics = scene.add.graphics();
        this.selectionZone = scene.add
            .zone(0, 0, 1, 1)
            .setDepth(depthConfig.SELECTION_ZONE);
    }

    // -----------------------------------------------------------------------
    // Rubber-band selection box
    // -----------------------------------------------------------------------

    drawSelectionBox(rect: Rect): void {
        this.selectionBoxGraphics.clear();
        this.selectionBoxGraphics.fillStyle(selectionBoxConfig.FILL_COLOR, selectionBoxConfig.FILL_ALPHA);
        this.selectionBoxGraphics.lineStyle(2, selectionBoxConfig.LINE_COLOR, selectionBoxConfig.LINE_ALPHA);
        this.selectionBoxGraphics.fillRect(rect.x, rect.y, rect.width, rect.height);
        this.selectionBoxGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }

    clearSelectionBox(): void {
        this.selectionBoxGraphics.clear();
    }

    // -----------------------------------------------------------------------
    // Entity outlines
    // -----------------------------------------------------------------------

    drawSelectionOutlines(rects: ReadonlyArray<Rect>): void {
        this.outlineGraphics.clear();
        this.outlineGraphics.lineStyle(
            selectionOutlineConfig.THICKNESS,
            selectionOutlineConfig.LINE_COLOR,
            selectionOutlineConfig.ALPHA,
        );
        for (const rect of rects) {
            this.outlineGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
    }

    drawSelectionOutline(rect: Rect): void {
        this.drawSelectionOutlines([rect]);
    }

    clearSelectionOutlines(): void {
        this.outlineGraphics.clear();
    }

    // -----------------------------------------------------------------------
    // Resize handles
    // -----------------------------------------------------------------------

    drawSizingHandles(
        rect: Rect,
        sizingHandles: Map<CardinalDir, Phaser.GameObjects.Graphics>,
    ): void {
        const o = handleResizeConfig.OFFSET;
        const positions: Record<CardinalDir, { x: number; y: number }> = {
            nw: { x: rect.x,                      y: rect.y },
            n:  { x: rect.x + rect.width / 2,     y: rect.y },
            ne: { x: rect.x + rect.width,          y: rect.y },
            w:  { x: rect.x,                      y: rect.y + rect.height / 2 },
            e:  { x: rect.x + rect.width,          y: rect.y + rect.height / 2 },
            sw: { x: rect.x,                      y: rect.y + rect.height },
            s:  { x: rect.x + rect.width / 2,     y: rect.y + rect.height },
            se: { x: rect.x + rect.width,          y: rect.y + rect.height },
        };

        for (const [dir, handle] of sizingHandles) {
            const pos = positions[dir];
            handle.clear();
            handle.x = pos.x - o;
            handle.y = pos.y - o;
            handle
                .fillStyle(0xffffff, 1)
                .fillRect(0, 0, handleResizeConfig.SIZE, handleResizeConfig.SIZE)
                .setVisible(true);
        }
    }

    clearSizingHandles(sizingHandles: Map<CardinalDir, Phaser.GameObjects.Graphics>): void {
        for (const handle of sizingHandles.values()) {
            handle.setVisible(false);
        }
    }

    // -----------------------------------------------------------------------
    // Selection zone
    // -----------------------------------------------------------------------

    /**
     * Positions the zone over `bbox` and enables it as a draggable interactive
     * area. Must be called after every selection change so the zone tracks the
     * current bounding box.
     */
    enableZone(bbox: Rect): void {
        this.selectionZone
            .setPosition(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2)
            .setSize(bbox.width, bbox.height);
        // setInteractive must be called after setSize so the hit-area matches
        // the updated dimensions.
        this.selectionZone.setInteractive();
        this.scene.input.setDraggable(this.selectionZone);
    }

    /** Deactivates the zone so pointer events fall through to the scene. */
    disableZone(): void {
        this.selectionZone.disableInteractive();
    }
}
