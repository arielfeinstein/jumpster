/**
 * GeometryUtils.ts
 *
 * Pure geometry helpers shared across the editor.
 * All functions are stateless and have no Phaser Scene dependency so they can
 * be called from any controller, view, or manager.
 *
 * Previously this logic was duplicated between Editor.ts
 * (getViewportEdgeAlignment, calcRectOutline) and SelectionView.ts
 * (getViewportEdgeAlignment). This file is the single canonical location.
 */

import Phaser from 'phaser';
import { CardinalDir, Rect } from '../types/EditorTypes';

// ---------------------------------------------------------------------------
// Bounding box
// ---------------------------------------------------------------------------

/**
 * A plain bounding rectangle calculated over a collection of positioned objects.
 * Unlike Phaser.Geom.Rectangle it carries no Phaser dependency.
 */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    /** x + width */
    right: number;
    /** y + height */
    bottom: number;
}

/**
 * Computes the axis-aligned bounding box that encloses all supplied rectangles.
 *
 * @param rects  One or more rectangle-like objects with x, y, width, height.
 * @returns The tightest bounding box that contains every supplied rect,
 *          or a zero-area box at the origin when the array is empty.
 */
export function calcBoundingBox(rects: ReadonlyArray<Rect>): BoundingBox {
    if (rects.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0, right: 0, bottom: 0 };
    }

    let minX = rects[0].x;
    let minY = rects[0].y;
    let maxX = rects[0].x + rects[0].width;
    let maxY = rects[0].y + rects[0].height;

    for (const r of rects) {
        if (r.x < minX) minX = r.x;
        if (r.y < minY) minY = r.y;
        if (r.x + r.width > maxX) maxX = r.x + r.width;
        if (r.y + r.height > maxY) maxY = r.y + r.height;
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        right: maxX,
        bottom: maxY,
    };
}

// ---------------------------------------------------------------------------
// Viewport edge alignment
// ---------------------------------------------------------------------------

/**
 * Returns the cardinal direction describing which viewport edge (or corner) the
 * rectangle touches, or `null` when it is fully interior.
 *
 * Used to decide where to render the delete button so it never overlaps the
 * selection outline AND never falls outside the visible viewport.
 *
 * @param rect    The rectangle to test — any object with x, y, width, height.
 * @param camera  The active Phaser camera (provides scrollX/Y and viewport size).
 */
export function getViewportEdgeAlignment(
    rect: Rect,
    camera: Phaser.Cameras.Scene2D.Camera,
): CardinalDir | null {
    const vw = camera.width;
    const vh = camera.height;

    // Convert world coords to viewport-relative coords.
    const x = rect.x - camera.scrollX;
    const y = rect.y - camera.scrollY;

    if (y === 0) {
        if (x === 0) return 'nw';
        if (x === vw - rect.width) return 'ne';
        return 'n';
    }

    if (y === vh - rect.height) {
        if (x === 0) return 'sw';
        if (x === vw - rect.width) return 'se';
        return 's';
    }

    if (x === 0) return 'w';
    if (x === vw - rect.width) return 'e';
    return null;
}
