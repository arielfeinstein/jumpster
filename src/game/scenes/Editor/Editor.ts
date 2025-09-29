import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';
import { TILE_SIZE } from '../../config';
import Platform from '../../gameObjects/Platform';

type EditorEntity = {
    entityType: EntityType;
    gameObject: Phaser.GameObjects.Image | Platform;
}

type cardinalDir = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';


const RED_TINT = 0xff0000;


export class Editor extends Scene {

    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    grid: Phaser.GameObjects.Grid;

    gameObjMap: Map<string, EditorEntity> = new Map();

    platforms: Phaser.GameObjects.Group;
    enemies: Phaser.GameObjects.Group;
    coins: Phaser.GameObjects.Group;
    checkpoints: Phaser.GameObjects.Group;
    startFlag: Phaser.GameObjects.Image | null = null;
    endFlag: Phaser.GameObjects.Image | null = null;

    deleteButton: Phaser.GameObjects.Image;

    sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics> = new Map();

    // each world unit one full viewport
    worldWidthUnit: number = 1;
    worldHeightUnit: number = 1;

    private selectedObject: Phaser.GameObjects.Image | Platform | null = null;
    private selectionOutline: Phaser.GameObjects.Graphics;


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

        EventBus.on('editor-change-dimensions', this.changeDimensions, this);
        EventBus.on('editor-place-entity', this.addEntity, this);

        this.selectionOutline = this.add.graphics().setDepth(100); // High depth to be on top
        this.selectionOutline.setVisible(false);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('editor-change-dimensions', this.changeDimensions, this);
            EventBus.off('editor-place-entity', this.addEntity, this);
        });

        this.initGroups();

        this.input.dragDistanceThreshold = 16; // start drag after 16px movement

        // Scene-level pointerdown for deselection when clicking on empty space.
        this.input.on('pointerdown', () => this.deselectObject());

        this.setupDeleteButton();

        this.setupSizingHandles();

        EventBus.emit('current-scene-ready', this);
    }

    /* --- SETUP HELPERS --- */
    private setupDeleteButton() {
        this.deleteButton = this.add.image(0, 0, 'red-cross')
            .setOrigin(0, 0)
            .setDepth(100)
            .setInteractive()
            .setVisible(false);

        this.deleteButton.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            if (!this.selectedObject) return;

            // can't delete platform if it has objects on it
            if (this.selectedObject instanceof Platform) {
                const objectsOnIt = this.getObjectsAbove(this.selectedObject);
                if (objectsOnIt.size > 0) return;
            }

            // remove selected object from platform below
            const platformsBelow = this.getPlatformsBelow(this.selectedObject);
            platformsBelow.forEach(platformBelow => {
                platformBelow.removeObjectOnIt(this.selectedObject!);
            });

            // remove from gameObjMap
            this.updateGameObjMap({ entityType: 'platform', gameObject: this.selectedObject }, 'remove');

            // destroy game object
            this.selectedObject.destroy();

            // deselect object
            this.deselectObject();

            // make deleteButton invisible and not clickable
            this.deleteButton.setVisible(false);
            this.deleteButton.disableInteractive();

            event.stopPropagation();
        });
    }

    private setupSizingHandles() {
        const dirs: cardinalDir[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        dirs.forEach(dir => {
            const handle = this.add.graphics().setDepth(150).setVisible(false);
            this.sizingHandles.set(dir, handle);
        });
    }

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
        const snappedPos = this.getSnappedCellPosition(x, y);
        // calculating logical rectangle based on entity type
        let geomRect: Phaser.Geom.Rectangle;
        if (entityType === 'platform' || entityType === 'enemy' || entityType === 'coin') {
            geomRect = new Phaser.Geom.Rectangle(snappedPos.x, snappedPos.y, TILE_SIZE, TILE_SIZE);
        }
        else {
            geomRect = new Phaser.Geom.Rectangle(snappedPos.x, snappedPos.y, TILE_SIZE, TILE_SIZE * 2);
        }

        if (!this.canObjectBePlaced(geomRect, entityType)) return;

        let gameObject: Phaser.GameObjects.Image | Platform;
        switch (entityType) {
            case 'platform':
                gameObject = new Platform(this, geomRect.x, geomRect.y, geomRect.width, geomRect.height);
                const objectsOnIt = this.getObjectsAbove(gameObject);
                objectsOnIt.forEach(objectOnIt => {
                    (gameObject as Platform).addObjectOnIt(objectOnIt);
                });
                break;
            case 'enemy':
                gameObject = this.add.image(geomRect.x, geomRect.y, entityType, 1).setOrigin(0, 0);
                break;
            case 'coin':
                gameObject = this.add.image(geomRect.x, geomRect.y, entityType).setOrigin(0, 0);
                break;
            case 'checkpoint':
                gameObject = this.add.image(geomRect.x, geomRect.y, 'checkpoint-flag', 4).setOrigin(0, 0);
                break;
            case 'start-flag':
                gameObject = this.add.image(geomRect.x, geomRect.y, entityType).setOrigin(0, 0);
                this.startFlag = gameObject;
                break;
            case 'end-flag':
                gameObject = this.add.image(geomRect.x, geomRect.y, entityType).setOrigin(0, 0);
                this.endFlag = gameObject;
                break;
        }

        if (entityType !== 'platform') {
            gameObject.setInteractive({ draggable: true })
        }

        gameObject.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            this.selectObject(gameObject);
            event.stopPropagation();
        });

        this.handleObjectDrag(gameObject, entityType);

        this.updateGameObjMap({ entityType: entityType, gameObject: gameObject }, 'add');

        // if there is a platform below - add this platform to its objectsOnIt set
        const platformsBelow = this.getPlatformsBelow(gameObject);
        platformsBelow.forEach(platformBelow => {
            platformBelow.addObjectOnIt(gameObject);
        });
    }

    /**
     * Snaps raw world coordinates to the nearest top-left corner of a grid cell.
     *
     * @param mouseX - The x-coordinate in world units to snap.
     * @param mouseY - The y-coordinate in world units to snap.
     * @returns A Phaser.Math.Vector2 representing the snapped top-left grid position.
     *
     * The snapping is based on the current cell size of the editor grid,
     * ensuring that placed entities align perfectly with grid cells.
     */
    private getSnappedCellPosition(mouseX: number, mouseY: number): Phaser.Math.Vector2 {
        const snappedX = Math.floor(mouseX / TILE_SIZE) * TILE_SIZE;
        const snappedY = Math.floor(mouseY / TILE_SIZE) * TILE_SIZE;
        return new Phaser.Math.Vector2(snappedX, snappedY);
    }

    /**
     * Creates a consistent, canonical string key from a position vector.
     * @param pos The position vector.
     * @returns A string representation in the format "x,y".
     */
    private static getPositionKey(pos: Phaser.Math.Vector2): string {
        return `${pos.x},${pos.y}`;
    }
    private initGroups() {
        this.platforms = this.add.group();
        this.enemies = this.add.group();
        this.coins = this.add.group();
        this.checkpoints = this.add.group();
    }

    /* ---- SELECTION ---- */

    private selectObject(obj: Phaser.GameObjects.Image | Platform) {
        // Do nothing if the object is already selected
        if (this.selectedObject === obj) {
            return;
        }

        this.deselectObject(); // Deselect previous object first

        this.selectedObject = obj;
        this.drawSelectionOutline();
        this.drawDeleteButton(obj.getBounds());
        this.drawSizingHandles(obj);
    }

    private deselectObject() {
        if (this.selectedObject) {
            this.selectedObject = null;

            this.selectionOutline.clear();
            this.selectionOutline.setVisible(false);

            this.deleteButton.setVisible(false);
            this.deleteButton.disableInteractive();
            this.clearSizingHanles();
        }
    }

    private drawSelectionOutline() {
        if (!this.selectedObject) return;

        this.selectionOutline.clear();

        const obj = this.selectedObject as any;
        const bounds = new Phaser.Geom.Rectangle(obj.x, obj.y, obj.width, obj.height);

        this.selectionOutline.lineStyle(2, 0xffff00, 1);
        this.selectionOutline.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.selectionOutline.setVisible(true);
    }


    private handleObjectDrag(object: Phaser.GameObjects.Image | Platform, entityType: EntityType) {
        let ghostDrag: Phaser.GameObjects.Image | Platform | null = null;
        let platformsBelowBeforeDrag: Set<Platform>;

        let tempStartFlag: Phaser.GameObjects.Image | null;
        let tempEndFlag: Phaser.GameObjects.Image | null;


        // Drag events
        object.on(
            "dragstart",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                // used to avoid placement logic check errors
                tempStartFlag = this.startFlag;
                tempEndFlag = this.endFlag;
                this.startFlag = null;
                this.endFlag = null;

                platformsBelowBeforeDrag = this.getPlatformsBelow(object);

                if (entityType === 'platform') {
                    ghostDrag = new Platform(this, object.x, object.y, object.width, object.height)
                }
                else if (entityType === 'enemy' || entityType === 'coin') {
                    ghostDrag = this.add.image(object.x, object.y, entityType).setOrigin(0, 0);
                }
                else {
                    ghostDrag = this.getFlagImage(entityType, new Phaser.Math.Vector2(object.x, object.y));
                    this.add.existing(ghostDrag);
                }


                ghostDrag.setAlpha(0.5);
                this.deselectObject();
            }
        );
        object.on(
            "drag",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                const snappedPos = this.getSnappedCellPosition(pointer.worldX, pointer.worldY);
                ghostDrag!.x = snappedPos.x;
                ghostDrag!.y = snappedPos.y;

                if (!this.canObjectBePlaced(ghostDrag!, entityType)) {
                    ghostDrag!.setTint(RED_TINT);
                }
                else {
                    ghostDrag!.clearTint();
                }
            }
        );
        object.on(
            "dragend",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {
                if (ghostDrag!.tint === RED_TINT) {
                    // invalid position - do nothing
                }
                else {
                    // valid position - move the enemy and update the map
                    this.updateGameObjMap({ entityType: entityType, gameObject: object }, 'remove');
                    object.x = ghostDrag!.x;
                    object.y = ghostDrag!.y;

                    this.updateGameObjMap({ entityType: entityType, gameObject: object }, 'add');

                    // if there was a platform below before the drag - remove this object from its objectsOnIt set
                    platformsBelowBeforeDrag.forEach(platformBelow => {
                        platformBelow.removeObjectOnIt(object);
                    });
                    // if there is a platform below after the drag - add this object to its objectsOnIt set
                    const platformsBelowAfterDrag = this.getPlatformsBelow(object);
                    platformsBelowAfterDrag.forEach(platformBelow => {
                        platformBelow.addObjectOnIt(object);
                    });
                    // if it's a platform add objects above it
                    if (entityType === 'platform') {
                        const objectsAbove = this.getObjectsAbove(object);
                        objectsAbove.forEach(objectAbove => {
                            (object as Platform).addObjectOnIt(objectAbove);
                        });
                    }
                }
                ghostDrag!.destroy();
                ghostDrag = null;
                this.selectObject(object);
                this.startFlag = tempStartFlag;
                this.endFlag = tempEndFlag;
            }
        );
    }

    /* ---- HELPERS ---- */

    private getPlatformsBelow(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform): Set<Platform> {
        const platformsBelow: Set<Platform> = new Set();

        if (rect.y === this.canvasHeight() * this.worldHeightUnit - TILE_SIZE) {
            return platformsBelow;
        }

        let y = rect.y + rect.height;
        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            const posBelowRectKey = Editor.getPositionKey(new Phaser.Math.Vector2(x, y));
            const editorEntity = this.gameObjMap.get(posBelowRectKey);
            if (editorEntity?.entityType === 'platform') {
                platformsBelow.add(editorEntity.gameObject as Platform);
            }
        }

        return platformsBelow;
    }

    private getObjectsAbove(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform): Set<Phaser.GameObjects.Image | Platform> {
        const platformsAbove: Set<Phaser.GameObjects.Image | Platform> = new Set();

        if (rect.y === 0) return platformsAbove;

        let y = rect.y - TILE_SIZE;
        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            const posAboveRectKey = Editor.getPositionKey(new Phaser.Math.Vector2(x, y));
            const editorEntity = this.gameObjMap.get(posAboveRectKey);
            if (editorEntity) {
                platformsAbove.add(editorEntity.gameObject);
            }
        }

        return platformsAbove;
    }


    private getFlagImage(flagType: 'checkpoint' | 'start-flag' | 'end-flag', pos: Phaser.Math.Vector2): Phaser.GameObjects.Image {
        if (flagType === 'checkpoint')
            return new Phaser.GameObjects.Image(this, pos.x, pos.y, 'checkpoint-flag', 4).setOrigin(0, 0);
        return new Phaser.GameObjects.Image(this, pos.x, pos.y, flagType).setOrigin(0, 0);
    }


    private canObjectBePlaced(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform, entityType: EntityType): boolean {
        if (this.isOverlapping(rect)) { 
            return false;
        }

        if ((entityType === 'start-flag' && this.startFlag) || (entityType === 'end-flag' && this.endFlag)) {
            return false; //can only be one start/end flag
        }

        let requirePlatformBelow = true;

        if (entityType === 'coin' || entityType === 'platform') {
            requirePlatformBelow = false;
        }

        if (requirePlatformBelow) {
            const platformsBelow = this.getPlatformsBelow(rect);
            if (platformsBelow.size === 0) {
                return false;
            }
        }
        return true;
    }

    /* return true if rect is overlapping with an occupied tile */
    private isOverlapping(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform): boolean {
        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            for (let y = rect.y; y < rect.y + rect.height; y += TILE_SIZE) {
                const posKey = Editor.getPositionKey(new Phaser.Math.Vector2(x, y));
                if (this.gameObjMap.has(posKey)) {
                    // An object at this position already exists.
                    return true;
                }
            }
        }
        return false;
    }

    /**
 * Adds or removes the occuptions of the tiles in the game object map.
 *
 * @param editorEntity The entity to add or remove from the map.
 * @param operation Whether to 'add' or 'remove' the entity from the map.
 */
    private updateGameObjMap(editorEntity: EditorEntity, operation: 'add' | 'remove') {
        const gameObject = editorEntity.gameObject;

        for (let x = gameObject.x; x < gameObject.x + gameObject.width; x += TILE_SIZE) {
            for (let y = gameObject.y; y < gameObject.y + gameObject.height; y += TILE_SIZE) {
                if (operation === 'add') {
                    this.gameObjMap.set(Editor.getPositionKey(new Phaser.Math.Vector2(x, y)), editorEntity);
                }
                else {
                    this.gameObjMap.delete(Editor.getPositionKey(new Phaser.Math.Vector2(x, y)));
                }
            }
        }
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

    private drawDeleteButton(rect: Phaser.Geom.Rectangle) {
        const edgeAlignment = this.getViewportEdgeAlignment(rect);

        const buttonCoordinates = {
            'nw': { x: rect.x - TILE_SIZE, y: rect.y - TILE_SIZE },
            'ne': { x: rect.x + rect.width, y: rect.y - TILE_SIZE },
            'sw': { x: rect.x - TILE_SIZE, y: rect.y + rect.height },
            'se': { x: rect.x + rect.width, y: rect.y + rect.height }
        }

        if (!edgeAlignment) {
            this.deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y).setVisible(true).setInteractive();
            return;
        }

        switch (edgeAlignment) {
            case 'nw':
                this.deleteButton.setX(buttonCoordinates.se.x).setY(buttonCoordinates.se.y);
                break;
            case 'n':
                this.deleteButton.setX(buttonCoordinates.sw.x).setY(buttonCoordinates.sw.y);
                break;
            case 'ne':
                this.deleteButton.setX(buttonCoordinates.sw.x).setY(buttonCoordinates.sw.y);
                break;
            case 'w':
                this.deleteButton.setX(buttonCoordinates.ne.x).setY(buttonCoordinates.ne.y);
                break;
            case 'e':
                this.deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y);
                break;
            case 'sw':
                this.deleteButton.setX(buttonCoordinates.ne.x).setY(buttonCoordinates.ne.y);
                break;
            case 's':
                this.deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y);
                break;
            case 'se':
                this.deleteButton.setX(buttonCoordinates.nw.x).setY(buttonCoordinates.nw.y)
                break;
        }
        this.deleteButton.setVisible(true).setInteractive();
    }

    private drawSizingHandles(obj: Phaser.GameObjects.Image | Platform) {
        const handleSize = 6;
        const handleOffset = handleSize / 2;

        const positions: { [key in cardinalDir]: { x: number, y: number } } = {
            nw: { x: obj.x, y: obj.y },
            n: { x: obj.x + obj.width / 2, y: obj.y },
            ne: { x: obj.x + obj.width, y: obj.y },
            w: { x: obj.x, y: obj.y + obj.height / 2 },
            e: { x: obj.x + obj.width, y: obj.y + obj.height / 2 },
            sw: { x: obj.x, y: obj.y + obj.height },
            s: { x: obj.x + obj.width / 2, y: obj.y + obj.height },
            se: { x: obj.x + obj.width, y: obj.y + obj.height },
        };

        for (const [dir, handle] of this.sizingHandles.entries()) {
            handle.removeAllListeners();
            const pos = positions[dir];

            handle.x = pos.x - handleOffset;
            handle.y = pos.y - handleOffset;

            handle.fillStyle(0xffffff, 1)
                .fillRect(0, 0, handleSize, handleSize)
                .setVisible(true)
                .setInteractive({
                    hitArea: new Phaser.Geom.Rectangle(0, 0, handleSize, handleSize),
                    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                    draggable: true
                });

            handle.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation();
            });

            this.handlePlatformResize(handle, dir);
        }
    }

    private clearSizingHanles() {
        for (const handle of this.sizingHandles.values()) {
            handle.clear();
            handle.setVisible(false);
            handle.disableInteractive();
        }
    }

    /**
     * Sets up drag event listeners for a platform's sizing handle to allow interactive resizing.
     *
     * This method is called when creating the sizing handles for a selected platform. It attaches
     * 'dragstart', 'drag', and 'dragend' listeners to a given handle.
     *
     * The drag behavior provides real-time visual feedback:
     * - On 'dragstart', the platform becomes semi-transparent, and its original state is saved.
     * - During 'drag', a "ghost" of the platform shows the new dimensions. The ghost is tinted red
     *   if the new size/position is invalid (e.g., overlaps another object or would orphan an
     *   object that was on top of it).
     * - On 'dragend', if the final size is valid, the platform's properties are updated. If invalid,
     *   the platform reverts to its original state.
     *
     * @param handle The Phaser.GameObjects.Graphics object representing the sizing handle being dragged.
     * @param dir The cardinal direction ('nw', 'n', 'ne', etc.) of the handle, which determines the resize logic.
     */
    private handlePlatformResize(handle: Phaser.GameObjects.Graphics, dir: cardinalDir) {

        if (!(this.selectedObject instanceof Platform)) return;        
        
        let platform: Platform;
        let originalPlatformProperties: {x:number, y: number, width: number, height: number, objectOnTop: Set<Phaser.GameObjects.GameObject>};

        /**
         * Calculates the rendering properties for a "ghost" platform during a resize operation.
         * This provides visual feedback to the user, showing what the new platform dimensions will be.
         * The calculation depends on an external `dir` variable, which specifies the resize handle's direction (e.g., 'nw', 's', 'e').
         *
         * @param snappedX - The current grid-snapped X coordinate of the pointer.
         * @param snappedY - The current grid-snapped Y coordinate of the pointer.
         * @returns An object with properties for the ghost platform's position and size.
         *          If the resize is invalid (e.g., dragging a top handle below the bottom edge),
         *          it returns `{ showGhost: false }` to hide the ghost.
         */
        const calcPlatRenderProps = (snappedX: number, snappedY: number): { showGhost: boolean, x?: number, y?: number, width?: number, height?: number } => {

            const platformLeft = this.selectedObject!.x;
            const platformRight = this.selectedObject!.x + this.selectedObject!.width;
            const platformTop = this.selectedObject!.y;
            const platformBottom = this.selectedObject!.y + this.selectedObject!.height;
            const platformWidth = this.selectedObject!.width;
            const platformHeight = this.selectedObject!.height;

            switch (dir) {
                case 'nw':
                    if (snappedX < platformRight && snappedY < platformBottom) {
                        return {
                            showGhost: true,
                            x: snappedX,
                            y: snappedY,
                            width: platformRight - snappedX,
                            height: platformBottom - snappedY
                        };
                    }
                    break;
                case 'n':
                    if (snappedY < platformBottom) {
                        return {
                            showGhost: true,
                            x: platformLeft,
                            y: snappedY,
                            width: platformWidth,
                            height: platformBottom - snappedY

                        }
                    }
                    break;
                case 'ne':
                    if (snappedX > platformLeft && snappedY < platformBottom) {
                        return {
                            showGhost: true,
                            x: platformLeft,
                            y: snappedY,
                            width: snappedX - platformLeft,
                            height: platformBottom - snappedY
                        }
                    }
                    break;
                case 'w':
                    if (snappedX < platformRight) {
                        return {
                            showGhost: true,
                            x: snappedX,
                            y: platformTop,
                            width: platformRight - snappedX,
                            height: platformHeight
                        }
                    }
                    break;
                case 'e':
                    if (snappedX > platformLeft) {
                        return {
                            showGhost: true,
                            x: platformLeft,
                            y: platformTop,
                            width: snappedX - platformLeft,
                            height: platformHeight
                        }
                    }
                    break;
                case 'sw':
                    if (snappedX < platformRight && snappedY > platformTop) {
                        return {
                            showGhost: true,
                            x: snappedX,
                            y: platformTop,
                            width: platformRight - snappedX,
                            height: snappedY - platformTop
                        }
                    }
                    break;
                case 's':
                    if (snappedY > platformTop) {
                        return {
                            showGhost: true,
                            x: platformLeft,
                            y: platformTop,
                            width: platformWidth,
                            height: snappedY - platformTop
                        }
                    }
                    break;
                case 'se':
                    if (snappedX > platformLeft && snappedY > platformTop) {
                        return {
                            showGhost: true,
                            x: platformLeft,
                            y: platformTop,
                            width: snappedX - platformLeft,
                            height: snappedY - platformTop
                        }
                    }
                    break;
            }
            return { showGhost: false };
        }

        handle.on(
            "dragstart",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                platform = this.selectedObject! as Platform;
                platform.setAlpha(0.5);
                this.updateGameObjMap({ entityType: 'platform', gameObject: platform! }, 'remove');
                
                // remove platform from the current platforms below
                this.getPlatformsBelow(platform).forEach(platBelow => {
                    platBelow.removeObjectOnIt(platform);
                })

                originalPlatformProperties = {
                    x: platform.x,
                    y: platform.y,
                    width: platform.width,
                    height: platform.height,
                    objectOnTop: platform.getObjectsOnIt()
                }
            }
        );
        handle.on(
            "drag",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                const snappedPos = this.getSnappedCellPosition(pointer.worldX, pointer.worldY);
                const renderProps = calcPlatRenderProps(snappedPos.x, snappedPos.y);
                if (renderProps.showGhost) {
                    platform.x = renderProps.x!;
                    platform.y = renderProps.y!;
                    platform.resize(renderProps.width!, renderProps.height!);
                    platform.setObjectsOnIt(this.getObjectsAbove(platform));
                    platform.setVisible(true);
                    if (!this.canObjectBePlaced(platform,'platform') || platform.getObjectsOnIt().size < originalPlatformProperties.objectOnTop.size) {
                        // cannot be placed - tint red 
                        platform.setTint(RED_TINT);
                    }
                    else { 
                        platform.clearTint();
                    }
                }
                else {
                    platform.setVisible(false);
                }
            }

        );
    
        handle.on(
            "dragend",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {
                this.deselectObject();

                if (!platform.visible || platform.tint === RED_TINT) {
                    // resize is illegal - restore to previous properties
                    platform.x = originalPlatformProperties.x;
                    platform.y = originalPlatformProperties.y;
                    platform.resize(originalPlatformProperties.width, originalPlatformProperties.height);
                    platform.setObjectsOnIt(originalPlatformProperties.objectOnTop);
                }
                
                platform.setVisible(true).setAlpha(1).clearTint();
                this.updateGameObjMap({ entityType: 'platform', gameObject: platform }, 'add');
                
                // add to platforms below the updated platform
                this.getPlatformsBelow(platform).forEach((platformBelow) => {
                    platformBelow.addObjectOnIt(platform);
                })

                this.selectObject(platform);
            }
        );
    }
}
