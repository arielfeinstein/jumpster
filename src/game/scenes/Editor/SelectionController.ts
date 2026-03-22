import Platform from '@/game/gameObjects/Platform';
import Phaser, { Game } from 'phaser';
import { cardinalDir, DRAG_THRESHOLD, EditorEntity, GameObject } from './Editor';
import GridManager from './GridManager';
import ControllerEvents from './ControllerEvents';
import { TILE_SIZE } from '@/game/config';



export default class SelectionController extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;

    private getObjectMap: () => Map<string, EditorEntity>;
    private updateToSnappedCoord: (coord: Phaser.Math.Vector2) => void;
    private deleteObjects: (gameObjects: Set<GameObject>) => void;
    private resizeSelectionRect: (rect: Phaser.Geom.Rectangle) => void;

    private selectedObjects: Set<GameObject> = new Set();

    // props related to select drag event
    private startCoordX: number = 0;
    private startCoordY: number = 0;
    private pointerSnappedCoord = new Phaser.Math.Vector2();
    private isDragging: boolean = false;
    private highlighted: Set<GameObject> = new Set();
    private prevHighlighedFrame: Set<GameObject> = new Set();
    private currHighlightedFrame: Set<GameObject> = new Set();
    private selectRect: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
    private gameObjectMap: Map<string, EditorEntity>; // set on pointer down
    // used to check if a rectangle of a game object intersects with the selction box
    private gameObjectRect: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();

    public disableSelectDrag = false;

    private deleteButton: Phaser.GameObjects.Image;
    private sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics>;

    constructor(
        scene: Phaser.Scene,
        getObjectMap: () => Map<string, EditorEntity>,
        updateToSnappedCoord: (coord: Phaser.Math.Vector2) => void,
        deleteObjects: (gameObjects: Set<GameObject>) => void,
        resizeSelectionRect: (rect: Phaser.Geom.Rectangle) => void,
        deleteButton: Phaser.GameObjects.Image,
        sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics>
    ) {

        super();

        this.scene = scene;

        this.getObjectMap = getObjectMap;
        this.updateToSnappedCoord = updateToSnappedCoord;
        this.deleteObjects = deleteObjects;
        this.resizeSelectionRect = resizeSelectionRect;


        this.deleteButton = deleteButton;
        this.sizingHandles = sizingHandles;
        this.setupInputListeners();
    }


    /* ---- SETUP ---- */

    private setupInputListeners() {
        this.scene.input.on('pointerdown', this.handlePointerDown, this);
        this.scene.input.on('pointermove', this.handlePointerMove, this);
        this.scene.input.on('pointerup', this.handlePointerUp, this);
    }

    /* ---- END SETUP ---- */

    /* ---- EVENTS ---- */

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        this.deselectAllObjects();
        const startingCoordinates = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        this.updateToSnappedCoord(startingCoordinates);
        this.startCoordX = startingCoordinates.x;
        this.startCoordY = startingCoordinates.y;
        this.gameObjectMap = this.getObjectMap(); // used for 'handlePointerMove'
    }

    //todo doc
    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (this.disableSelectDrag) return;
        // first check if dragging and update 'isDragging' if needed
        if (pointer.isDown && !this.isDragging) {
            const distFromStartCoord = Math.sqrt((pointer.worldX - this.startCoordX) ** 2 + (pointer.worldY - this.startCoordY) ** 2);
            if (distFromStartCoord > DRAG_THRESHOLD) {
                this.isDragging = true;
            }
        }
        if (!this.isDragging || !pointer.isDown) return;

        // selection box logic

        this.updatePointerSnappedCoord(pointer.worldX, pointer.worldY);

        // resize selection box
        this.updateSelectRect();
        this.resizeSelectionRect(this.selectRect);


        // determine highlighted objects

        const frameKeys = this.getFrameKeys(this.selectRect);
        frameKeys.forEach((key: string) => {
            if (this.gameObjectMap.has(key)) {
                this.currHighlightedFrame.add(this.gameObjectMap.get(key)!.gameObject);
            }
        });

        let hasSelectedObjsChanged = false;

        this.highlighted.forEach((highlightedObj) => {
            this.gameObjectRect.x = highlightedObj.x;
            this.gameObjectRect.y = highlightedObj.y;
            this.gameObjectRect.height = highlightedObj.height;
            this.gameObjectRect.width = highlightedObj.width;

            const inSelectionBox = Phaser.Geom.Intersects.RectangleToRectangle(
                this.gameObjectRect,
                this.selectRect
            );

            if (!inSelectionBox) {
                this.highlighted.delete(highlightedObj);
                hasSelectedObjsChanged = true;
            }
        });

        this.currHighlightedFrame.forEach((obj) => {
            this.highlighted.add(obj);
            hasSelectedObjsChanged = true;
        });

        this.currHighlightedFrame.clear();

        if (hasSelectedObjsChanged) {
            this.emit(ControllerEvents.HIGHLITED_OBJS_UPDATED, this.highlighted);
        }



    }

    private handlePointerUp(pointer: Phaser.Input.Pointer) {
        if (this.isDragging) {
            // set selectedObjects
            this.selectObjects(this.highlighted);

            // clear highlights
            this.highlighted.clear();
            this.currHighlightedFrame.clear();
            this.prevHighlighedFrame.clear();
        }

        this.isDragging = false;

        this.disableSelectDrag = false;

        this.emit(ControllerEvents.SELECTION_DRAG_ENDED);
    }

    /* ---- END EVENTS ---- */

    /* ---- SELECT/DESELECT ---- */

    selectObjects(objectsToSelect: Set<GameObject>) {
        // if this.selectedObjects is equal to objectsToSelect then do nothing
        if (this.selectedObjects.size === objectsToSelect.size && this.selectedObjects.isSubsetOf(objectsToSelect)) {
            return;
        }

        // if there are no objects to select do nothing
        if (objectsToSelect.size === 0) return;

        this.deselectAllObjects();

        this.selectedObjects = new Set(objectsToSelect);

        this.deleteButton.setInteractive();

        // if there is only one object to select and it's a platform, enable resizing handles
        const obj = objectsToSelect.values().next().value;
        const resizeHandlesNeeded = objectsToSelect.size === 1 && obj instanceof Platform;
        if (resizeHandlesNeeded) this.setSizingHanlesInteractive(true);

        // emit selected objects
        this.emit(ControllerEvents.SELECTED_OBJECTS, this.selectedObjects, resizeHandlesNeeded);
    }

    deselectAllObjects() {
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

    /* ---- GETTERS ---- */

    getSelectedObjs(): Set<GameObject> {
        return this.selectedObjects;
    }

    /* ---- HELPERS ---- */

    //todo: doc
    private updateSelectRect() {
        const currentX = this.pointerSnappedCoord.x;
        const currentY = this.pointerSnappedCoord.y;

        const x = Math.min(this.startCoordX, currentX);
        const y = Math.min(this.startCoordY, currentY);
        let width = Math.abs(currentX - this.startCoordX);
        let height = Math.abs(currentY - this.startCoordY);

        if (currentX >= this.startCoordX) {
            width += TILE_SIZE;
        }
        if (currentY >= this.startCoordY) {
            height += TILE_SIZE;
        }

        // update rectangle
        this.selectRect.x = x;
        this.selectRect.y = y;
        this.selectRect.width = width;
        this.selectRect.height = height;
    }

    //todo: doc
    private getFrameKeys(rect: Phaser.Geom.Rectangle): string[] {
        const keys: string[] = [];

        // top and buttom
        for (let i = rect.x; i < rect.x + rect.width; i += TILE_SIZE) {
            keys.push(GridManager.getPositionKey(new Phaser.Math.Vector2(i, rect.y)));
            keys.push(GridManager.getPositionKey(new Phaser.Math.Vector2(i, rect.y + rect.height - TILE_SIZE)));
        }

        // left and right
        for (let i = rect.y + TILE_SIZE; i < rect.y + rect.height - TILE_SIZE; i += TILE_SIZE) {
            keys.push(GridManager.getPositionKey(new Phaser.Math.Vector2(rect.x, i)));
            keys.push(GridManager.getPositionKey(new Phaser.Math.Vector2(rect.x + rect.width - TILE_SIZE, i)));
        }

        return keys;
    }

    private updatePointerSnappedCoord(x: number, y: number) {
        this.pointerSnappedCoord.x = x;
        this.pointerSnappedCoord.y = y;

        this.updateToSnappedCoord(this.pointerSnappedCoord);
    }
}
