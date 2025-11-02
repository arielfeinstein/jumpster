import { GameObject, cardinalDir } from "./Editor";
import { TILE_SIZE } from '../../config';

const selectionBoxConfig = {
    LINE_COLOR: 0x808080,
    FILL_COLOR: 0x808080,
    LINE_ALPHA: 1,
    FILL_ALPHA: 0.15
} as const;

const selectionOutlineConfig = {
    LINE_COLOR: 0xffff00,
    ALPHA: 1,
    THICKNESS: 2
} as const;

export const handleResizeConfig = {
    SIZE: 6,
    OFFSET: 3
} as const;

export default class SelectionView {

    private outlineGraphics: Phaser.GameObjects.Graphics;

    // related to selection box
    private selectionBoxGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene) {
        this.outlineGraphics = scene.add.graphics();

        this.selectionBoxGraphics = scene.add.graphics();
    }

    /* ---- SELECTION BOX ---- */

    drawSelectionBox(rect: Phaser.Geom.Rectangle): SelectionView {
        this.selectionBoxGraphics.clear();

        // set fill style
        this.selectionBoxGraphics.fillStyle(selectionBoxConfig.FILL_COLOR, selectionBoxConfig.FILL_ALPHA);

        // set line style
        this.selectionBoxGraphics.lineStyle(2, selectionBoxConfig.LINE_COLOR, selectionBoxConfig.LINE_ALPHA);

        // draw
        this.selectionBoxGraphics.fillRect(rect.x, rect.y, rect.width, rect.height);
        this.selectionBoxGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
        return this;
    }

    clearSelectionBox(): SelectionView {
        this.selectionBoxGraphics.clear();
        return this;
    }

    /* ---- END SELECTION BOX ---- */

    /* ---- OBJECT HIGHLIGHT ---- */

    private highlightRect(rect: GameObject | Phaser.Geom.Rectangle) {
        console.log(`x: ${rect.x}, y: ${rect.y}, w: ${rect.width}, h: ${rect.height}`);
        this.outlineGraphics.lineStyle(
            selectionOutlineConfig.THICKNESS,
            selectionOutlineConfig.LINE_COLOR,
            selectionOutlineConfig.ALPHA
        );
        this.outlineGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }

    drawSelectionOutlines(rects: Set<GameObject | Phaser.Geom.Rectangle>): SelectionView {
        this.outlineGraphics.clear();

        rects.forEach((rect) => {
            this.highlightRect(rect);
        });
        return this;
    }

    drawSelectionOutline(rect: GameObject | Phaser.Geom.Rectangle): SelectionView {
        this.outlineGraphics.clear();

        this.highlightRect(rect);
        return this;
    }

    clearSelectionOutlines(): SelectionView {
        this.outlineGraphics.clear();
        return this;
    }

    /* ---- END OBJECT HIGHLIGHT ---- */

    /* ---- DELETE BUTON ---- */

    drawDeleteButton(rect: Phaser.Geom.Rectangle, camera: Phaser.Cameras.Scene2D.Camera, deleteButton: Phaser.GameObjects.Image): SelectionView {
        const edgeAlignment = this.getViewportEdgeAlignment(rect, camera);

        const buttonCoordinates = {
            'nw': { x: rect.x - TILE_SIZE, y: rect.y - TILE_SIZE },
            'ne': { x: rect.x + rect.width, y: rect.y - TILE_SIZE },
            'sw': { x: rect.x - TILE_SIZE, y: rect.y + rect.height },
            'se': { x: rect.x + rect.width, y: rect.y + rect.height }
        }

        if (!edgeAlignment) {
            deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y).setVisible(true).setInteractive();
            return this;
        }

        switch (edgeAlignment) {
            case 'nw':
                deleteButton.setX(buttonCoordinates.se.x).setY(buttonCoordinates.se.y);
                break;
            case 'n':
                deleteButton.setX(buttonCoordinates.sw.x).setY(buttonCoordinates.sw.y);
                break;
            case 'ne':
                deleteButton.setX(buttonCoordinates.sw.x).setY(buttonCoordinates.sw.y);
                break;
            case 'w':
                deleteButton.setX(buttonCoordinates.ne.x).setY(buttonCoordinates.ne.y);
                break;
            case 'e':
                deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y);
                break;
            case 'sw':
                deleteButton.setX(buttonCoordinates.ne.x).setY(buttonCoordinates.ne.y);
                break;
            case 's':
                deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y);
                break;
            case 'se':
                deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y);
                break;
        }
        deleteButton.setVisible(true);
        return this;
    }

    clearDeleteButton(deleteButton: Phaser.GameObjects.Image): SelectionView {
        deleteButton.setVisible(false);
        return this;
    }

    /**
         * Calculates the position of a rectangle relative to the camera's viewport edges.
         * This is used to determine if the rectangle is at the north, south, east, west, or a corner of the viewport.
         * @param rect The rectangle-like object to check. Can be a `Phaser.Geom.Rectangle`, `Phaser.GameObjects.Image`, or `Platform`.
         * @returns A string representing the position ('n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw') or `null` if the rectangle is not at an edge.
    */
    private getViewportEdgeAlignment(rect: Phaser.Geom.Rectangle | GameObject, camera: Phaser.Cameras.Scene2D.Camera): cardinalDir | null {
        const viewportWidth = camera.width;
        const viewportHeight = camera.height;

        const x = rect.x - camera.scrollX;
        const y = rect.y - camera.scrollY;

        if (y === 0) {
            if (x === 0) return 'nw';
            else if (x === viewportWidth - rect.width) return 'ne';
            else return 'n';
        }

        if (y === viewportHeight - rect.height) {
            if (x === 0) return 'sw';
            else if (x === viewportWidth - rect.width) return 'se';
            else return 's';
        }

        if (x === 0) return 'w';
        else if (x === viewportWidth - rect.width) return 'e';
        return null;
    }

    /* ---- END DELETE BUTON ---- */

    /* ---- SIZING HANDLES ---- */

    drawSizingHandles(rect: GameObject | Phaser.Geom.Rectangle, sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics>): SelectionView {
        const positions: { [key in cardinalDir]: { x: number, y: number } } = {
            nw: { x: rect.x, y: rect.y },
            n: { x: rect.x + rect.width / 2, y: rect.y },
            ne: { x: rect.x + rect.width, y: rect.y },
            w: { x: rect.x, y: rect.y + rect.height / 2 },
            e: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
            sw: { x: rect.x, y: rect.y + rect.height },
            s: { x: rect.x + rect.width / 2, y: rect.y + rect.height },
            se: { x: rect.x + rect.width, y: rect.y + rect.height },
        };

        for (const [dir, handle] of sizingHandles.entries()) {
            const pos = positions[dir];

            handle.x = pos.x - handleResizeConfig.OFFSET;
            handle.y = pos.y - handleResizeConfig.OFFSET;

            handle.fillStyle(0xffffff, 1)
                .fillRect(0, 0, handleResizeConfig.SIZE, handleResizeConfig.SIZE)
                .setVisible(true);
        }
        return this;
    }

    clearSizingHandles(sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics>): SelectionView {
        for (const handle of sizingHandles.values()) {
            handle.setVisible(false);
        }
        return this;
    }

    /* ---- END SIZING HANDLES ---- */
}