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
import { CardinalDir, Rect } from '../types/EditorTypes';
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

    private readonly outlineGraphics: Phaser.GameObjects.Graphics;
    private readonly selectionBoxGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene) {
        this.outlineGraphics = scene.add.graphics();
        this.selectionBoxGraphics = scene.add.graphics();
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
}
