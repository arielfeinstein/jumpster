import { DimensionPos, GameObject, cardinalDir } from "./Editor";
import { TILE_SIZE } from '../../config';

const selectionBoxConfig = {
    LINE_COLOR: 0x00FFFF,
    FILL_COLOR: 0x00FFFF,
    LINE_ALPHA: 1,
    FILL_ALPHA: 0.15
} as const;

const selectionOutlineConfig = {
    LINE_COLOR: 0xffff00,
    ALPHA: 1,
    THICKNESS: 2
} as const;

const handleResizeConfig = {
    SIZE: 6,
    OFFSET: 3
} as const;

export default class SelectionView {

    private outlineGraphics: Phaser.GameObjects.Graphics;

    // related to selection box
    private selectionBoxGraphics: Phaser.GameObjects.Graphics;

    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.outlineGraphics = scene.add.graphics();

        this.selectionBoxGraphics = scene.add.graphics();
    }

    /* ---- SELECTION BOX ---- */

    drawSelectionBox(spec: DimensionPos) {
        this.selectionBoxGraphics.clear()

        // set fill style
        this.selectionBoxGraphics.fillStyle(selectionBoxConfig.FILL_COLOR, selectionBoxConfig.FILL_ALPHA);

        // set line style
        this.selectionBoxGraphics.lineStyle(2, selectionBoxConfig.LINE_COLOR, selectionBoxConfig.LINE_ALPHA);

        // draw
        this.selectionBoxGraphics.fillRect(spec.x, spec.y, spec.width, spec.height);
        this.selectionBoxGraphics.strokeRect(spec.x, spec.y, spec.width, spec.height);
    }

    clearSelectionBox() {
        this.selectionBoxGraphics.clear();
    }

    /* ---- END SELECTION BOX ---- */

    /* ---- OBJECT HIGHLIGHT ---- */

    private highlightObject(spec: GameObject | DimensionPos) {
        this.outlineGraphics.lineStyle(
            selectionOutlineConfig.THICKNESS,
            selectionOutlineConfig.LINE_COLOR,
            selectionOutlineConfig.ALPHA
        );
        this.outlineGraphics.strokeRect(spec.x, spec.y, spec.width, spec.height);
    }

    drawSelectionOutlines(specs: Set<GameObject | DimensionPos>) {
        this.outlineGraphics.clear();

        specs.forEach((spec) => {
            this.highlightObject(spec);
        });
    }

    clearSelectionOutlines() {
        this.outlineGraphics.clear();
    }

    /* ---- END OBJECT HIGHLIGHT ---- */

    /* ---- DELETE BUTON ---- */

    drawDeleteButton(rectSpec: DimensionPos, camera: Phaser.Cameras.Scene2D.Camera, deleteButton: Phaser.GameObjects.Image) {
        const edgeAlignment = this.getViewportEdgeAlignment(rectSpec, camera);

        const buttonCoordinates = {
            'nw': { x: rectSpec.x - TILE_SIZE, y: rectSpec.y - TILE_SIZE },
            'ne': { x: rectSpec.x + rectSpec.width, y: rectSpec.y - TILE_SIZE },
            'sw': { x: rectSpec.x - TILE_SIZE, y: rectSpec.y + rectSpec.height },
            'se': { x: rectSpec.x + rectSpec.width, y: rectSpec.y + rectSpec.height }
        }

        if (!edgeAlignment) {
            deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y).setVisible(true).setInteractive();
            return;
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
                deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y)
                break;
        }
        deleteButton.setVisible(true);
    }

    hideDeleteButton(deleteButton: Phaser.GameObjects.Image) {
        deleteButton.setVisible(false);
    }

    /**
         * Calculates the position of a rectangle relative to the camera's viewport edges.
         * This is used to determine if the rectangle is at the north, south, east, west, or a corner of the viewport.
         * @param rect The rectangle-like object to check. Can be a `Phaser.Geom.Rectangle`, `Phaser.GameObjects.Image`, or `Platform`.
         * @returns A string representing the position ('n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw') or `null` if the rectangle is not at an edge.
    */
    private getViewportEdgeAlignment(rect: DimensionPos | GameObject, camera: Phaser.Cameras.Scene2D.Camera): cardinalDir | null {
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

    drawSizingHandles(rectSpec: GameObject | DimensionPos, sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics>) {
        const positions: { [key in cardinalDir]: { x: number, y: number } } = {
            nw: { x: rectSpec.x, y: rectSpec.y },
            n: { x: rectSpec.x + rectSpec.width / 2, y: rectSpec.y },
            ne: { x: rectSpec.x + rectSpec.width, y: rectSpec.y },
            w: { x: rectSpec.x, y: rectSpec.y + rectSpec.height / 2 },
            e: { x: rectSpec.x + rectSpec.width, y: rectSpec.y + rectSpec.height / 2 },
            sw: { x: rectSpec.x, y: rectSpec.y + rectSpec.height },
            s: { x: rectSpec.x + rectSpec.width / 2, y: rectSpec.y + rectSpec.height },
            se: { x: rectSpec.x + rectSpec.width, y: rectSpec.y + rectSpec.height },
        };

        for (const [dir, handle] of sizingHandles.entries()) {
            const pos = positions[dir];

            handle.x = pos.x - handleResizeConfig.OFFSET;
            handle.y = pos.y - handleResizeConfig.OFFSET;

            handle.fillStyle(0xffffff, 1)
                .fillRect(0, 0, handleResizeConfig.SIZE, handleResizeConfig.SIZE)
                .setVisible(true);
        }
    }

    hideSizingHandles(sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics>) {
        for (const handle of sizingHandles.values()) {
            handle.setVisible(false);
        }
    }

    /* ---- END SIZING HANDLES ---- */
}