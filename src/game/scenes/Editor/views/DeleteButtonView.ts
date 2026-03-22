/**
 * DeleteButtonView.ts
 *
 * Positions and shows/hides the delete button relative to the current
 * selection outline.
 *
 * The button is placed at the northwest corner of the selection by default.
 * When the selection is at a viewport edge the button is shifted to stay
 * fully on screen, using the canonical `getViewportEdgeAlignment` from
 * GeometryUtils (eliminates the switch statement that appeared in the old
 * SelectionView and Editor.ts).
 */

import Phaser from 'phaser';
import { Rect, CardinalDir } from '../types/EditorTypes';
import { getViewportEdgeAlignment } from '../utils/GeometryUtils';
import { TILE_SIZE } from '../../../config';

/** The four corners where the delete button can be placed. */
type CornerKey = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Maps each viewport-edge alignment to the opposite corner of the selection,
 * so the button is always visible regardless of where the entity is.
 *
 * Using Record<CardinalDir, CornerKey> lets TypeScript enforce that all eight
 * directions are handled at compile time (no runtime fallthrough risk).
 */
const edgeToCorner: Record<CardinalDir, CornerKey> = {
    nw: 'se',
    n:  'sw',
    ne: 'sw',
    w:  'ne',
    e:  'nw',
    sw: 'ne',
    s:  'nw',
    se: 'nw',
};

export default class DeleteButtonView {

    /**
     * Positions the delete button relative to `rect` and makes it interactive.
     *
     * @param rect         The bounding rectangle of the current selection.
     * @param camera       The active camera (used for viewport edge detection).
     * @param deleteButton The delete button image object.
     */
    show(
        rect: Rect,
        camera: Phaser.Cameras.Scene2D.Camera,
        deleteButton: Phaser.GameObjects.Image,
    ): void {
        const corners: Record<CornerKey, { x: number; y: number }> = {
            nw: { x: rect.x - TILE_SIZE,          y: rect.y - TILE_SIZE },
            ne: { x: rect.x + rect.width,          y: rect.y - TILE_SIZE },
            sw: { x: rect.x - TILE_SIZE,           y: rect.y + rect.height },
            se: { x: rect.x + rect.width,          y: rect.y + rect.height },
        };

        const edgeAlignment = getViewportEdgeAlignment(rect, camera);
        const corner = edgeAlignment ? edgeToCorner[edgeAlignment] : 'nw';
        const pos = corners[corner];

        deleteButton
            .setX(pos.x)
            .setY(pos.y)
            .setVisible(true)
            .setInteractive();
    }

    hide(deleteButton: Phaser.GameObjects.Image): void {
        deleteButton.setVisible(false).disableInteractive();
    }
}
