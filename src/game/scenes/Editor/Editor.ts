import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';
import { TILE_SIZE } from '../../config';
import Platform from '../../gameObjects/Platform';

type EditorEntity = {
    entityType: EntityType;
    gameObject: Phaser.GameObjects.Image | Platform;
}

const redTint = 0xff0000;


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
    // each world unit one full viewport
    worldWidthUnit: number = 1;
    worldHeightUnit: number = 1;

    private selectedObject: Phaser.GameObjects.GameObject | null = null;
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

        EventBus.emit('current-scene-ready', this);
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

    private selectObject(obj: Phaser.GameObjects.GameObject) {
        // Do nothing if the object is already selected
        if (this.selectedObject === obj) {
            return;
        }

        this.deselectObject(); // Deselect previous object first

        this.selectedObject = obj;
        this.drawSelectionOutline();
    }

    private deselectObject() {
        if (this.selectedObject) {
            this.selectedObject = null;

            this.selectionOutline.clear();
            this.selectionOutline.setVisible(false);
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
                    ghostDrag!.setTint(redTint);
                }
                else {
                    ghostDrag!.clearTint();
                }
            }
        );
        object.on(
            "dragend",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {
                if (ghostDrag!.tint === redTint) {
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
        if (this.isOverlapping(rect)) return false;

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
}
