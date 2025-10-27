import Platform from '@/game/gameObjects/Platform';
import Phaser, { Game } from 'phaser';
import { cardinalDir, DRAG_THRESHOLD, getPositionKey, EditorEntity, GameObject } from './Editor';
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

    // pauseListeners() {
    //     this.scene.input.off('pointerdown', this.handlePointerDown, this);
    //     this.scene.input.off('pointermove', this.handlePointerMove, this);
    //     this.scene.input.off('pointerup', this.handlePointerUp, this);
    // }

    // resumeListeners() {
    //     this.isDragging = false;
    //     this.setupInputListeners();
    // }

    // pauseSelectionDrag() {
    //     this.isDragging = false;
    //     this.scene.input.off('pointermove', this.handlePointerMove, this);
    // }

    // resumeSelectionDrag() {
    //     this.scene.input.on('pointermove', this.handlePointerMove, this);
    // }

    // private setupDeleteButton() {
    //     this.deleteButton = this.scene.add.image(0, 0, 'red-cross')
    //         .setOrigin(0, 0)
    //         .setDepth(100)
    //         .setVisible(false);

    //     this.deleteButton.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
    //         this.deleteObjects(this.selectedObjects);

    //         this.deselectAllObjects();

    //         this.deleteButton.setVisible(false);
    //         this.deleteButton.disableInteractive();

    //         event.stopPropagation();
    //     });
    // }

    // private setupSizingHandles() {
    //     const dirs: cardinalDir[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    //     dirs.forEach(dir => {
    //         const handle = this.scene.add.graphics().setDepth(150).setVisible(false);

    //         handle.setInteractive({
    //             hitArea: new Phaser.Geom.Rectangle(0, 0, this.handleResizeSize, this.handleResizeSize),
    //             hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    //             draggable: true
    //         })

    //         handle.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
    //             event.stopPropagation();
    //         });

    //         handle.disableInteractive();

    //         this.sizingHandles.set(dir, handle);
    //     });
    // }

    /* ---- END SETUP ---- */

    /* ---- EVENTS ---- */

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        this.deselectAllObjects();
        const startingCoordinates = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        this.updateToSnappedCoord(startingCoordinates);
        this.startCoordX = startingCoordinates.x;
        this.startCoordY = startingCoordinates.y;
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

        // add objects in the outer frame to curr
        const frameKeys = this.getFrameKeys(this.selectRect);
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

        this.selectedObjects = objectsToSelect;

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
            keys.push(getPositionKey(new Phaser.Math.Vector2(i, rect.y)));
            keys.push(getPositionKey(new Phaser.Math.Vector2(i, rect.y + rect.height - TILE_SIZE)));
        }

        // left and right
        for (let i = rect.y + TILE_SIZE; i < rect.y + rect.height - TILE_SIZE; i += TILE_SIZE) {
            keys.push(getPositionKey(new Phaser.Math.Vector2(rect.x, i)));
            keys.push(getPositionKey(new Phaser.Math.Vector2(rect.x + rect.width - TILE_SIZE, i)));
        }

        return keys;
    }

    private updatePointerSnappedCoord(x: number, y: number) {
        this.pointerSnappedCoord.x = x;
        this.pointerSnappedCoord.y = y;

        this.updateToSnappedCoord(this.pointerSnappedCoord);
    }
}
