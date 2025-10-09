import Platform from '@/game/gameObjects/Platform';
import Phaser, { Game } from 'phaser';
import { cardinalDir, DRAG_THRESHOLD, getPositionKey, EditorEntity } from './Editor';
import ControllerEvents from './ControllerEvents';
import { TILE_SIZE } from '@/game/config';

type GameObject = Phaser.GameObjects.Image | Platform


export default class SelectionController extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;

    private getObjectMap: () => Map<string, EditorEntity>;
    private getSnappedCoord: (x: number, y: number) => { x: number, y: number };
    private getHandleResizeSize: () => number;
    private deleteObjects: (gameObjects: Set<GameObject>) => void;
    private resizeSelectionRect: (x: number, y: number, width: number, height: number) => void;
    private highlightObj: (obj: GameObject) => void;
    private dehighlightObj: (obj: GameObject) => void;

    private selectedObjects: Set<GameObject> = new Set();

    // props related to select drag event
    private startCoordX: number = 0;
    private startCoordY: number = 0;
    private isDragging: boolean = false;
    private highlighted: Set<GameObject> = new Set();
    private prevHighlighedFrame: Set<GameObject> = new Set();
    private currHighlightedFrame: Set<GameObject> = new Set();

    private deleteButton: Phaser.GameObjects.Image;
    sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics> = new Map();

    constructor(scene: Phaser.Scene,
        getObjectMap: () => Map<string, EditorEntity>,
        getHandleResizeSize: () => number,
        getSnappedCoord: (x: number, y: number) => { x: number, y: number },
        deleteObjects: (gameObjects: Set<GameObject>) => void,
        resizeSelectionRect: (x: number, y: number, width: number, height: number) => void,
        highlightObj: (obj: GameObject) => void,
        dehighlightObj: (obj: GameObject) => void
    ) {

        super();

        this.scene = scene;

        this.getObjectMap = getObjectMap;
        this.getHandleResizeSize = getHandleResizeSize;
        this.getSnappedCoord = getSnappedCoord;
        this.deleteObjects = deleteObjects;
        this.resizeSelectionRect = resizeSelectionRect;


        this.setupDeleteButton();
        this.setupSizingHandles();
        this.setupInputListeners();
    }


    /* ---- SETUP ---- */

    private setupInputListeners() {
        this.scene.input.on('pointerdown', this.handlePointerDown, this);
        this.scene.input.on('pointermove', this.handlePointerMove, this);
        this.scene.input.on('pointerup', this.handlePointerUp, this);
    }

    private setupDeleteButton() {
        this.deleteButton = this.scene.add.image(0, 0, 'red-cross')
            .setOrigin(0, 0)
            .setDepth(100)
            .setVisible(false);

        this.deleteButton.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            this.deleteObjects(this.selectedObjects);

            this.deselectAllObjects();

            this.deleteButton.setVisible(false);
            this.deleteButton.disableInteractive();

            event.stopPropagation();
        });
    }

    private setupSizingHandles() {
        const handleSize = this.getHandleResizeSize();

        const dirs: cardinalDir[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        dirs.forEach(dir => {
            const handle = this.scene.add.graphics().setDepth(150).setVisible(false);

            handle.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(0, 0, handleSize, handleSize),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                draggable: true
            })

            handle.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation();
            });

            handle.disableInteractive();

            this.sizingHandles.set(dir, handle);
        });
    }

    /* ---- END SETUP ---- */

    /* ---- EVENTS ---- */

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        this.deselectAllObjects();
        const startingCoordinates = this.getSnappedCoord(pointer.worldX, pointer.worldY);
        this.startCoordX = startingCoordinates.x;
        this.startCoordY = startingCoordinates.y;
    }

    //todo doc
    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        // first check if dragging and update 'isDragging' if needed
        if (!this.isDragging) {
            if (Math.sqrt((pointer.worldX - this.startCoordX) ^ 2 + (pointer.worldY - this.startCoordY) ^ 2) > DRAG_THRESHOLD) {
                this.isDragging = true;
            }
            else {
                return;
            }
        }

        // selection box logic

        // resize selection box
        const selectRectProperties = this.calcSelectRect(pointer.worldX, pointer.worldY);
        this.resizeSelectionRect(selectRectProperties.rectX, selectRectProperties.rectY, selectRectProperties.rectWidth, selectRectProperties.rectHeight);

        // add objects in the outer frame to curr
        const frameKeys = this.getFrameKeys(selectRectProperties.rectX, selectRectProperties.rectY, selectRectProperties.rectWidth, selectRectProperties.rectHeight);
        frameKeys.forEach((key: string) => {
            const objMap = this.getObjectMap();
            if (objMap.has(key)) {
                this.currHighlightedFrame.add(objMap.get(key)!.gameObject)
            }

        });
        
        let hasSelectedObjsChanged = false;

        this.prevHighlighedFrame.forEach((obj) => {
            if (!this.currHighlightedFrame.has(obj)) {
                this.highlighted.delete(obj);
                hasSelectedObjsChanged = true;
            }
        });

        // add new objects that are in the selection box
        this.currHighlightedFrame.forEach((obj) => {
            // this.highlightObj(obj);
            this.highlighted.add(obj);
        });

        // get ready for next iteration
        this.prevHighlighedFrame = this.currHighlightedFrame;
        this.currHighlightedFrame.clear();

        // emit changes
        if (hasSelectedObjsChanged) {
            this.emit(ControllerEvents.SELECTION_BOX_UPDATED, this.highlighted);
        }
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer) {
        if (this.isDragging) {
            // set selectedObjects
            this.selectObjects(this.highlighted);

            // clear highlights
            this.highlighted.forEach((obj) => {
                this.dehighlightObj(obj);
            });
            this.highlighted.clear();
            this.currHighlightedFrame.clear();
            this.prevHighlighedFrame.clear();
        }
    }

    /* ---- END EVENTS ---- */

    /* ---- SELECT/DESELECT ---- */

    private selectObjects(objectsToSelect: Set<GameObject>) {
        // if this.selectedObjects is equal to objectsToSelect then do nothing
        if (this.selectedObjects.size === objectsToSelect.size && this.selectedObjects.isSubsetOf(objectsToSelect)) {
            return;
        }

        // if there are no objects to select do nothing
        if (objectsToSelect.size === 0) return;

        this.deselectAllObjects();

        this.selectedObjects = objectsToSelect;

        this.deleteButton.setInteractive();

        // if there is only one object to select and it's a platform, enable resizing handles
        const obj = objectsToSelect.values().next().value;
        if (objectsToSelect.size === 1 && obj instanceof Platform) {
            this.setSizingHanlesInteractive(true);
            this.emit(ControllerEvents.SELECTED_OBJECTS, this.selectedObjects, 'single-platform-selected');
        }
        else {
            this.emit(ControllerEvents.SELECTED_OBJECTS, this.selectedObjects);
        }
    }

    private deselectAllObjects() {
        if (this.selectedObjects.size === 0) return;

        this.selectedObjects.clear();

        this.deleteButton.disableInteractive();
        this.setSizingHanlesInteractive(false);

        this.emit(ControllerEvents.DESELECTED_ALL);
    }

    /* ---- END SELECT/DESELECT ---- */

    private setSizingHanlesInteractive(setInteractive: boolean) {
        for (const handle of this.sizingHandles.values()) {
            if (setInteractive) {
                handle.setInteractive();
            }
            else {
                handle.disableInteractive();
            }
        }
    }

    destroy() {
        this.scene.input.off('pointerdown', this.handlePointerDown, this);
        this.scene.input.off('pointermove', this.handlePointerMove, this);
        this.scene.input.off('pointerup', this.handlePointerUp, this);

        // remove resizing handles listeners
        for (const handle of this.sizingHandles.values()) {
            handle.removeAllListeners();
        }

        this.deleteButton.removeAllListeners();
    }

    /* ---- HELPERS ---- */

    //todo: doc
    private calcSelectRect(currentX: number, currentY: number): { rectX: number, rectY: number, rectWidth: number, rectHeight: number } {
        const snappedCoord = this.getSnappedCoord(currentX, currentY);
        currentX = snappedCoord.x;
        currentY = snappedCoord.y;

        return {
            rectX: Math.min(this.startCoordX, currentX),
            rectY: Math.min(this.startCoordY, currentY),
            rectWidth: Math.abs(currentX - this.startCoordX),
            rectHeight: Math.abs(currentY - this.startCoordY)
        }
    }

    //todo: doc
    private getFrameKeys(x: number, y: number, width: number, height: number): string[] {
        const keys: string[] = [];

        // top and buttom
        for (let i = x; i < x + width; i += TILE_SIZE) {
            keys.push(getPositionKey(new Phaser.Math.Vector2(i, y)));
            keys.push(getPositionKey(new Phaser.Math.Vector2(i, y + height - TILE_SIZE)));
        }

        // left and right
        for (let i = y + TILE_SIZE; i < y + height - TILE_SIZE; i += TILE_SIZE) {
            keys.push(getPositionKey(new Phaser.Math.Vector2(x, i)));
            keys.push(getPositionKey(new Phaser.Math.Vector2(x + width - TILE_SIZE, i)));
        }

        return keys;
    }
}