import { Game, Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';
import { TILE_SIZE } from '../../config';
import Platform from '../../gameObjects/Platform';
import SelectionController from './SelectionController';
import { handleResizeConfig } from './SelectionView';
import SelectionView from './SelectionView';
import ControllerEvents from './ControllerEvents';
import PlatformResizeController from './PlatformResizeController';
import ObjectDragController from './ObjectDragController';
import EntityManager from './EntityManager';
import GridManager from './GridManager';
import PlacementController from './PlacementController';

// todo: debug selection and check the rest works as before

/* ---- TYPE DECLARATION ---- */

export type EditorEntity = {
    entityType: EntityType;
    gameObject: Phaser.GameObjects.Image | Platform;
}

export type GameObject = Phaser.GameObjects.Image | Platform;

export type cardinalDir = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

/* ---- GLOBAL HELPERS ---- */

/* ---- CONSTANTS ---- */

export const RED_TINT = 0xff0000;

export const DRAG_THRESHOLD = 16;

export const depthConfig = {
    DELETE_BUTTON: 100,
    SIZING_HANDLES: 150
} as const;

/* 
    ---- CLASS ---- 
    todo: insert class doc here    
*/


export class Editor extends Scene {

    /* ---- PROPERTIES ---- */

    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    grid: Phaser.GameObjects.Grid;

    public entityManager!: EntityManager;
    gameObjMap: Map<string, EditorEntity> = new Map();

    platforms: Phaser.GameObjects.Group;
    enemies: Phaser.GameObjects.Group;
    coins: Phaser.GameObjects.Group;
    checkpoints: Phaser.GameObjects.Group;
    startFlag: Phaser.GameObjects.Image | null = null;
    endFlag: Phaser.GameObjects.Image | null = null;

    // each world unit one full viewport
    worldWidthUnit: number = 1;
    worldHeightUnit: number = 1;

    public selectionController: SelectionController;
    private selectionView: SelectionView;

    private platformResizeController: PlatformResizeController;
    public objectDragController: ObjectDragController;
    private placementController: PlacementController;

    private deleteButton: Phaser.GameObjects.Image;



    /* ---- INITIALIZATION ---- */

    constructor() {
        super('Editor');
    }

    create() {
        // Fill the visible canvas with the background, independent of world size
        const vw = this.scale.width;
        const vh = this.scale.height;
        this.add
            .image(0, 0, 'background')
            .setOrigin(0, 0)
            .setDisplaySize(vw, vh)
            .setScrollFactor(0)
            .setDepth(-10);

        // Create a grid that covers the entire canvas initially
        this.grid = this.add.grid(0, 0, this.canvasWidth(), this.canvasHeight(), TILE_SIZE, TILE_SIZE).setOrigin(0, 0);
        this.grid.setOutlineStyle(0x000000, 1);

        // Set initial camera and physics bounds to match the canvas size
        this.cameras.main.setBounds(0, 0, this.canvasWidth(), this.canvasHeight());
        this.physics.world.setBounds(0, 0, this.canvasWidth(), this.canvasHeight());

        this.cursors = this.input.keyboard!.createCursorKeys();

        this.initGroups();

        this.input.dragDistanceThreshold = DRAG_THRESHOLD;

        this.entityManager = new EntityManager(this, this.gameObjMap);
        
        this.setupDeleteButton();

        this.setupPlatformResizeController();
        
        this.setupSelection();

        this.objectDragController = new ObjectDragController(this);
        this.placementController = new PlacementController(this, this.entityManager, this.selectionController, this.objectDragController);

        this.setupEventListeners();

        EventBus.emit('current-scene-ready', this);
    }

    private setupPlatformResizeController() {
        this.platformResizeController = new PlatformResizeController(
            this,
            this.entityManager
        );
    }

    private setupDeleteButton() {
        this.deleteButton = this.add.image(0, 0, 'red-cross')
            .setOrigin(0, 0)
            .setDepth(depthConfig.DELETE_BUTTON)
            .setVisible(false);

        this.deleteButton.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            this.deleteObjs(this.selectionController.getSelectedObjs());

            this.selectionController.deselectAllObjects();

            this.deleteButton.setVisible(false);
            this.deleteButton.disableInteractive();

            event.stopPropagation();
        });

    }

    private setupSelection() {
        this.selectionView = new SelectionView(this);

        this.selectionController = new SelectionController(
            this,
            () => { return this.gameObjMap; },
            GridManager.updateToSnappedCoord,
            this.deleteObjs.bind(this),
            this.selectionView.drawSelectionBox.bind(this.selectionView),
            this.deleteButton,
            this.platformResizeController.sizingHandles,
        );
    }

    private setupEventListeners() {
        // event bus listeners
        EventBus.on('editor-change-dimensions', this.changeDimensions, this);
        EventBus.on('editor-place-entity', this.placementController.placeEntity, this.placementController);
        EventBus.on('ui-drag-cancelled', () => {
            this.input.activePointer.isDown = false;
        }, this);

        // selection controller listeners
        this.selectionController.on(ControllerEvents.SELECTED_OBJECTS, (objs: Set<GameObject>, resizeHandlesNeeded: boolean) => {
            this.selectionView.clearSelectionBox();
            this.selectionView.clearSelectionOutlines();

            const outlineRect = new Phaser.Geom.Rectangle();
            this.calcRectOutline(objs, outlineRect);

            this.selectionView.drawSelectionOutline(outlineRect);
            this.selectionView.drawDeleteButton(outlineRect, this.cameras.main, this.deleteButton);
            if (resizeHandlesNeeded) {
                this.selectionView.drawSizingHandles(outlineRect, this.platformResizeController.sizingHandles);
                this.platformResizeController.setPlatform(objs.values().next().value as Platform);
                this.platformResizeController.addResizeListeners();
            }
        });

        this.selectionController.on(ControllerEvents.DESELECTED_ALL, () => {
            this.selectionView.clearSelectionBox();
            this.selectionView.clearSelectionOutlines();
            this.selectionView.clearDeleteButton(this.deleteButton);
            this.selectionView.clearSizingHandles(this.platformResizeController.sizingHandles);
            this.platformResizeController.removeDragListeners();
        });

        // todo: draw select around selected objects individually
        this.selectionController.on(ControllerEvents.HIGHLITED_OBJS_UPDATED, (inSelection: Set<GameObject>) => {
            this.selectionView.drawSelectionOutlines(inSelection);
        });

        this.selectionController.on(ControllerEvents.SELECTION_DRAG_ENDED, this.selectionView.clearSelectionBox, this.selectionView);

        // platform resize events
        this.platformResizeController.on(ControllerEvents.PLATFORM_RESIZE_CLICKED, () => {
            this.selectionController.disableSelectDrag = true;
        });

        this.platformResizeController.on(ControllerEvents.PLATFORM_RESIZE_STARTED, (plat: Platform) => {
            // remove from game objects map to not interfere with placement check logic
            this.entityManager.updateGameObjMap({entityType: 'platform', gameObject: plat}, 'remove');
        });

        this.platformResizeController.on(ControllerEvents.PLATFORM_RESIZE_ENDED, (plat: Platform) => {
            this.entityManager.updateGameObjMap({ entityType: 'platform', gameObject: plat }, 'add');
            this.selectionController.deselectAllObjects();
            this.selectionController.selectObjects(new Set([plat]));
        });

        // shutdwon listener - when scene is shutdown remove listeners
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('editor-change-dimensions', this.changeDimensions, this);
            EventBus.off('editor-place-entity', this.placementController.placeEntity, this.placementController);
            EventBus.off('ui-drag-cancelled');
            this.selectionController.destroy();
            this.platformResizeController.destroy();
        });

    }

    /* ---- SCROLLING THROUGH THE GAME WORLD ---- */

    update() {


        // handle camera scroll
        if (this.cursors.left.isDown) {
            this.cameras.main.scrollX -= TILE_SIZE;
        }
        else if (this.cursors.right.isDown) {
            this.cameras.main.scrollX += TILE_SIZE;
        }

        if (this.cursors.up.isDown) {
            this.cameras.main.scrollY -= TILE_SIZE;
        }

        if (this.cursors.down.isDown) {
            this.cameras.main.scrollY += TILE_SIZE;
        }
    }

    /* ---- GAME OBJECT MANIPULATION ---- */

    private deleteObjs(objs: Set<GameObject>) {
        // get upper objects that are platforms
        const upperPlats = new Set<Platform>;
        this.getUpperObjects(objs).forEach((obj) => {
            if (obj instanceof Platform) upperPlats.add(obj);
        });

        // check those platform don't have anything above them
        let canRmObjs = true;
        upperPlats.forEach((plat) => {
            if (plat.getObjectsOnIt().size !== 0) {
                canRmObjs = false;
                return;
            }
        });
        if (!canRmObjs) return;

        // get lower objects
        const lowerObjs = this.getLowerObjects(objs);

        // remove lower objects from platforms below them
        lowerObjs.forEach((obj) => {
            const platsBelow = this.entityManager.getPlatformsBelow(obj);
            platsBelow.forEach((platBelow) => {
                platBelow.removeObjectOnIt(obj);
            });
        });

        // safe to delete objects
        objs.forEach((obj) => {
            this.entityManager.updateGameObjMap({ entityType: 'platform', gameObject: obj }, 'remove'); // entity type does not have effect when removing
            obj.destroy();
        });
    }

    /**
     * Updates the size of the editor world and grid based on the number of world units provided.
     * Each world unit corresponds to a fixed block size of 800x600 pixels.
     *
     * @param worldWidthUnit - Number of horizontal blocks (must be > 0).
     * @param worldHeightUnit - Number of vertical blocks (must be > 0).
     *
     * The camera and physics bounds are resized to match the new world size,
     * and the grid object is updated accordingly.
     */
    changeDimensions({ worldWidthUnit, worldHeightUnit }: { worldWidthUnit: number, worldHeightUnit: number }) {
        if (worldWidthUnit <= 0 || worldHeightUnit <= 0) return;
        const width = this.canvasWidth() * worldWidthUnit;
        const height = this.canvasHeight() * worldHeightUnit;
        this.cameras.main.setBounds(0, 0, width, height);
        this.physics.world.setBounds(0, 0, width, height);
        this.grid.width = width;
        this.grid.height = height;
        this.worldWidthUnit = worldWidthUnit;
        this.worldHeightUnit = worldHeightUnit;
    }

    private canvasWidth(): number {
        return this.scale.width;
    }

    private canvasHeight(): number {
        return this.scale.height;
    }

    private addEntity({ entityType, x, y }: { entityType: EntityType, x: number, y: number }) {
        this.placementController.placeEntity({ entityType, x, y });
    }

    private initGroups() {
        this.platforms = this.add.group();
        this.enemies = this.add.group();
        this.coins = this.add.group();
        this.checkpoints = this.add.group();
    }

    /* ---- HELPERS ---- */

    /*
    return a set of objects with the minimal y value
     */
    private getUpperObjects(objs: Set<GameObject>): Set<GameObject> {
        const upperObjs: Set<GameObject> = new Set();

        if (objs.size === 0) return upperObjs;

        const minY = this.getMinY(objs);

        objs.forEach((obj) => {
            if (obj.y === minY) upperObjs.add(obj);
        });

        return upperObjs;
    }

    /*
    return a set of objects with the maximal y value
     */
    private getLowerObjects(objs: Set<GameObject>): Set<GameObject> {
        const lowerObjs: Set<GameObject> = new Set();

        if (objs.size === 0) return lowerObjs;

        const maxY = this.getMaxY(objs);

        objs.forEach((obj) => {
            if ((obj.y + obj.height) === maxY) lowerObjs.add(obj);
        });

        return lowerObjs;
    }

    private calcRectOutline(objs: Set<GameObject>, rectToUpdate: Phaser.Geom.Rectangle) {
        rectToUpdate.x = this.getMinX(objs);
        rectToUpdate.y = this.getMinY(objs);
        rectToUpdate.width = this.getMaxX(objs) - rectToUpdate.x;
        rectToUpdate.height = this.getMaxY(objs) - rectToUpdate.y;
    }

    private getMinX(objs: Set<GameObject>): number {
        if (objs.size === 0) return 0;

        let minX = objs.values().next().value!.x;
        objs.forEach((obj) => {
            minX = minX > obj.x ? obj.x : minX;
        });

        return minX;
    }

    private getMinY(objs: Set<GameObject>): number {
        if (objs.size === 0) return 0;

        let minY = objs.values().next().value!.y;
        objs.forEach((obj) => {
            minY = minY > obj.y ? obj.y : minY;
        });

        return minY;
    }

    private getMaxX(objs: Set<GameObject>): number {
        if (objs.size === 0) return 0;

        const firstObj = objs.values().next().value!;
        let maxX = firstObj.x + firstObj.width;
        objs.forEach((obj) => {
            maxX = maxX < obj.x + obj.width ? obj.x + obj.width : maxX;
        });

        return maxX;
    }

    private getMaxY(objs: Set<GameObject>): number {
        if (objs.size === 0) return 0;

        const firstObj = objs.values().next().value!;
        let maxY = firstObj.y + firstObj.height;
        objs.forEach((obj) => {
            maxY = maxY < obj.y + obj.height ? obj.y + obj.height : maxY;
        });

        return maxY;
    }


    public getFlagImage(flagType: 'checkpoint' | 'start-flag' | 'end-flag', pos: Phaser.Math.Vector2): Phaser.GameObjects.Image {
        if (flagType === 'checkpoint')
            return new Phaser.GameObjects.Image(this, pos.x, pos.y, 'checkpoint-flag', 4).setOrigin(0, 0);
        return new Phaser.GameObjects.Image(this, pos.x, pos.y, flagType).setOrigin(0, 0);
    }

    /**
     * Calculates the position of a rectangle relative to the camera's viewport edges.
     * This is used to determine if the rectangle is at the north, south, east, west, or a corner of the viewport.
     * @param rect The rectangle-like object to check. Can be a `Phaser.Geom.Rectangle`, `Phaser.GameObjects.Image`, or `Platform`.
     * @returns A string representing the position ('n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw') or `null` if the rectangle is not at an edge.
     */
    private getViewportEdgeAlignment(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform): cardinalDir | null {
        const camera = this.cameras.main;

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
}
