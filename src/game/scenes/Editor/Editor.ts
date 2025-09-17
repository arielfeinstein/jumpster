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
    }

    private canvasWidth(): number {
        return this.scale.width;
    }

    private canvasHeight(): number {
        return this.scale.height;
    }

    private addEntity({ entityType, x, y }: { entityType: EntityType, x: number, y: number }) {
        const topLeftSnappedPos: Phaser.Math.Vector2 = this.getSnappedCellPosition(x, y);

        const posKey = Editor.getPositionKey(topLeftSnappedPos);
        if (this.gameObjMap.has(posKey)) { return; } // already occupied

        switch (entityType) {
            case 'platform':
                this.addPlatform(topLeftSnappedPos)
                break;
            case 'enemy':
                this.addEnemy(topLeftSnappedPos);
                break;
            case 'coin':
                this.addCoin(topLeftSnappedPos);
                break;
            default:
                // default: it's a flag type ('checkpoint', 'start-flag', 'end-flag')
                this.addFlag(entityType, topLeftSnappedPos);
                break;

        }
    }

    /* Test method to visualize entity placement and grid snapping */
    private addEntityTest({ entityType, x, y }: { entityType: EntityType, x: number, y: number }) {
        const topLeftSnappedPos: Phaser.Math.Vector2 = this.getSnappedCellPosition(x, y);
        //this.add.rectangle(topLeftSnappedPos.x, topLeftSnappedPos.y, TILE_SIZE, TILE_SIZE, 0xff0000, 0.5).setOrigin(0, 0);
        //const flag = this.add.sprite(topLeftSnappedPos.x, topLeftSnappedPos.y, 'checkpoint-flag').setOrigin(0,0);
        this.add.image(topLeftSnappedPos.x, topLeftSnappedPos.y, 'end-flag').setOrigin(0, 0);
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

    /* ---- ADD ENTITY METHODS ---- */
    private addPlatform(pos: Phaser.Math.Vector2) {
        const platform = new Platform(this, pos.x, pos.y, TILE_SIZE, TILE_SIZE);
        this.platforms.add(platform);
        // Platform is made interactive in its own constructor to ensure correct hit area.

        platform.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            this.selectObject(platform);
            event.stopPropagation(); // Prevent scene-level listener from firing.
        });

        this.handleObjectDrag(platform, 'platform');

        const posKey = Editor.getPositionKey(pos);
        this.gameObjMap.set(posKey, { entityType: 'platform', gameObject: platform });

        // if there is a platform below - add this platform to its objectsOnIt set
        const platformsBelow = this.getPlatformsBelow(platform);
        platformsBelow.forEach(platformBelow => {
            platformBelow.addObjectOnIt(platform);
        });
    }

    private addEnemy(pos: Phaser.Math.Vector2) {
        if (this.canObjectBePlaced(new Phaser.Geom.Rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE), true)) {
            // platform below - add enemy
            const enemy = this.add.image(pos.x, pos.y, 'enemy', 1).setOrigin(0, 0);
            this.enemies.add(enemy);

            enemy.setInteractive({ draggable: true }).on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
                this.selectObject(enemy);
                event.stopPropagation();
            });

            this.handleObjectDrag(enemy, 'enemy');

            const posKey = Editor.getPositionKey(pos);
            this.gameObjMap.set(posKey, { entityType: 'enemy', gameObject: enemy });

            // if there is a platform below - add this platform to its objectsOnIt set
            const platformsBelow = this.getPlatformsBelow(enemy);
            platformsBelow.forEach(platformBelow => {
                platformBelow.addObjectOnIt(enemy);
            });
        }
    }

    private addCoin(pos: Phaser.Math.Vector2) {
        const coin = this.add.image(pos.x, pos.y, 'coin').setOrigin(0, 0);
        this.coins.add(coin);

        coin.setInteractive({ draggable: true }).on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            this.selectObject(coin);
            event.stopPropagation();
        });

        this.handleObjectDrag(coin, 'coin');

        const posKey = Editor.getPositionKey(pos);
        this.gameObjMap.set(posKey, { entityType: 'coin', gameObject: coin });

        // if there is a platform below - add this platform to its objectsOnIt set
        const platformsBelow = this.getPlatformsBelow(coin);
        platformsBelow.forEach(platformBelow => {
            platformBelow.addObjectOnIt(coin);
        });
    }

    private addFlag(flagType: 'checkpoint' | 'start-flag' | 'end-flag', pos: Phaser.Math.Vector2) {
        if ((flagType === 'start-flag' && this.startFlag) || (flagType === 'end-flag' && this.endFlag)) {
            return; // already exists
        }

        if (!this.canObjectBePlaced(new Phaser.Geom.Rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE * 2), true)) return;

        const flagImage = this.getFlagImage(flagType, pos);

        switch (flagType) {
            case 'checkpoint':
                this.add.existing(flagImage);
                this.checkpoints.add(flagImage);
                break;
            case 'start-flag':
                this.add.existing(flagImage);
                this.startFlag = flagImage;
                break;
            case 'end-flag':
                this.add.existing(flagImage);
                this.endFlag = flagImage;
                break;
        }


        flagImage.setInteractive({ draggable: true }).on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            this.selectObject(flagImage);
            event.stopPropagation();
        });

        this.handleObjectDrag(flagImage, flagType);

        const posKeyTop = Editor.getPositionKey(pos);
        const posKeyBottom = Editor.getPositionKey(new Phaser.Math.Vector2(pos.x, pos.y + TILE_SIZE));
        this.gameObjMap.set(posKeyTop, { entityType: flagType, gameObject: flagImage });
        this.gameObjMap.set(posKeyBottom, { entityType: flagType, gameObject: flagImage });

        // if there is a platform below - add this platform to its objectsOnIt set
        const platformsBelow = this.getPlatformsBelow(flagImage);
        platformsBelow.forEach(platformBelow => {
            platformBelow.addObjectOnIt(flagImage);
        });
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
        //debug
        console.log('occupied tiles:');
        console.log(this.gameObjMap.keys());
        //end debug

        if (this.selectedObject) {
            this.selectedObject = null;
            // It's good practice to both clear and hide the graphics object.
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

    /* ---- HANDLE OBJECT DRAGGING ---- */
    private handleObjectDrag(object: Phaser.GameObjects.Image | Platform, entityType: EntityType) {
        let ghostDrag: Phaser.GameObjects.Image | Platform | null = null;
        let platformsBelowBeforeDrag: Set<Platform>;

        // Drag events
        object.on(
            "dragstart",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                platformsBelowBeforeDrag = this.getPlatformsBelow(object);

                // ghostDrag = entityType === 'platform' ? ghostDrag = new Platform(this, object.x, object.y, object.width, object.height) :
                //     this.add.image(object.x, object.y, entityType).setOrigin(0, 0);

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

                let requirePlatformBelow = false;
                if (entityType === 'enemy' || entityType === 'checkpoint' || entityType === 'start-flag' || entityType === 'end-flag') {
                    requirePlatformBelow = true;
                }
                if (!this.canObjectBePlaced(ghostDrag!, requirePlatformBelow)) {
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
                    const oldPosKey = Editor.getPositionKey(new Phaser.Math.Vector2(object.x, object.y));
                    this.gameObjMap.delete(oldPosKey);
                    object.x = ghostDrag!.x;
                    object.y = ghostDrag!.y;
                    const newPosKey = Editor.getPositionKey(new Phaser.Math.Vector2(object.x, object.y));
                    this.gameObjMap.set(newPosKey, { entityType: entityType, gameObject: object });

                    // if there was a platform below before the drag - remove this object from its objectsOnIt set
                    platformsBelowBeforeDrag.forEach(platformBelow => {
                        platformBelow.removeObjectOnIt(object);
                    });
                    // if there is a platform below after the drag - add this object to its objectsOnIt set
                    const platformsBelowAfterDrag = this.getPlatformsBelow(object);
                    platformsBelowAfterDrag.forEach(platformBelow => {
                        platformBelow.addObjectOnIt(object);
                    });
                }
                ghostDrag!.destroy();
                ghostDrag = null;
                this.selectObject(object);
            }
        );
    }

    /* ---- HELPERS ---- */
    
    private getPlatformsBelow(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform): Set<Platform> {
        const platformsBelow: Set<Platform> = new Set();

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


    private getFlagImage(flagType: 'checkpoint' | 'start-flag' | 'end-flag', pos: Phaser.Math.Vector2) {
        if (flagType === 'checkpoint')
            return new Phaser.GameObjects.Image(this, pos.x, pos.y, 'checkpoint-flag', 4).setOrigin(0, 0);
        return new Phaser.GameObjects.Image(this, pos.x, pos.y, flagType).setOrigin(0, 0);
    }


    private canObjectBePlaced(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform, requirePlatformBelow: boolean = false): boolean {
        if (this.isOverlapping(rect)) return false;
        if (requirePlatformBelow) {
            const platformsBelow = this.getPlatformsBelow(rect);
            if (platformsBelow.size === 0) return false;
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











    //todo: make generic add entity method







    // private createCompositePlatform(x: number, y: number, width: number, height: number) {
    //     const myPlatform = new Platform(this, x, y, width, height);

    //     // IMPORTANT: You make the CONTAINER interactive, not its children.
    //     // myPlatform.setInteractive();
    //     // this.input.setDraggable(myPlatform);

    //     // Add it to your data model just like before
    //     // (You'd add properties to the Platform class or manage it in a separate data object)
    // }
}
