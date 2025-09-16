import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';
import { TILE_SIZE } from '../../config';
import Platform from '../../gameObjects/Platform';
import { get } from 'http';

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

        this.handlePlatformDrag(platform);

        const posKey = Editor.getPositionKey(pos);
        this.gameObjMap.set(posKey, { entityType: 'platform', gameObject: platform });

        // if there is a platform below - add this platform to its objectsOnIt set
        const platformBelow = this.getPlatformBelow(pos);
        if (platformBelow) {
            platformBelow.addObjectOnIt(platform);
        }
    }

    private addEnemy(pos: Phaser.Math.Vector2) {
        if (this.getPlatformBelow(pos)) {
            // platform below - add enemy
            const enemy = this.add.image(pos.x, pos.y, 'enemy', 1).setOrigin(0, 0);
            this.enemies.add(enemy);

            enemy.setInteractive({ draggable: true }).on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
                this.selectObject(enemy);
                event.stopPropagation();
            });

            this.handleEnemyDrag(enemy);

            const posKey = Editor.getPositionKey(pos);
            this.gameObjMap.set(posKey, { entityType: 'enemy', gameObject: enemy });

            const platformBelow = this.getPlatformBelow(pos);
            if (platformBelow) {
                platformBelow.addObjectOnIt(enemy);
            }
        }
    }

    private addCoin(pos: Phaser.Math.Vector2) {
        const coin = this.add.image(pos.x, pos.y, 'coin').setOrigin(0, 0);
        this.coins.add(coin);

        coin.setInteractive({ draggable: true }).on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            this.selectObject(coin);
            event.stopPropagation();
        });

        this.handleCoinDrag(coin);

        const posKey = Editor.getPositionKey(pos);
        this.gameObjMap.set(posKey, { entityType: 'coin', gameObject: coin });

        const platformBelow = this.getPlatformBelow(pos);
        if (platformBelow) {
            platformBelow.addObjectOnIt(coin);
        }
    }

    private addFlag(entityType: 'checkpoint' | 'start-flag' | 'end-flag', pos: Phaser.Math.Vector2) {
        if ((entityType === 'start-flag' && this.startFlag) || (entityType === 'end-flag' && this.endFlag)) {
            return; // already exists
        }

        if (!this.canFlagBePlacedAt(pos)) return;

        let flagImage: Phaser.GameObjects.Image;

        if (entityType === 'checkpoint') {
            flagImage = this.add.image(pos.x, pos.y, 'checkpoint-flag', 4).setOrigin(0, 0);
            this.checkpoints.add(flagImage);
        } else { // 'start-flag' or 'end-flag'
            flagImage = this.add.image(pos.x, pos.y, entityType).setOrigin(0, 0);
            if (entityType === 'start-flag') {
                this.startFlag = flagImage;
            } else { // 'end-flag'
                this.endFlag = flagImage;
            }
        }

        flagImage.setInteractive({ draggable: true }).on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            this.selectObject(flagImage);
            event.stopPropagation();
        });

        this.handleFlagDrag(flagImage, entityType);

        const posKeyTop = Editor.getPositionKey(pos);
        const posKeyBottom = Editor.getPositionKey(new Phaser.Math.Vector2(pos.x, pos.y + TILE_SIZE));
        this.gameObjMap.set(posKeyTop, { entityType: entityType, gameObject: flagImage });
        this.gameObjMap.set(posKeyBottom, { entityType: entityType, gameObject: flagImage });

        const platformBelow = this.getPlatformBelow(new Phaser.Math.Vector2(pos.x, pos.y + TILE_SIZE));
        if (platformBelow) {
            platformBelow.addObjectOnIt(flagImage);
        }
    }


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
    private handlePlatformDrag(platform: Platform) {
        let ghostDrag: Platform | null = null;
        const platformBelowBeforeDrag: Platform | null = this.getPlatformBelow(new Phaser.Math.Vector2(platform.x, platform.y));
        // Drag events
        platform.on(
            "dragstart",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                ghostDrag = new Platform(this, platform.x, platform.y, platform.width, platform.height);
                ghostDrag.setAlpha(0.5);
                this.deselectObject();
            }
        );
        platform.on(
            "drag",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                const snappedPos = this.getSnappedCellPosition(pointer.worldX, pointer.worldY);
                ghostDrag!.x = snappedPos.x;
                ghostDrag!.y = snappedPos.y;

                // check if any tile the platform would occupy is already taken
                // if so, tint red
                // otherwise, clear tint
                for (let x = 0; x < platform.width; x += TILE_SIZE) {
                    for (let y = 0; y < platform.height; y += TILE_SIZE) {
                        const posKey = Editor.getPositionKey(new Phaser.Math.Vector2(snappedPos.x + x, snappedPos.y + y));
                        if (this.gameObjMap.has(posKey)) {
                            ghostDrag!.setTint(redTint);
                            return;
                        }
                    }
                }
                ghostDrag!.clearTint();
            }
        );
        platform.on(
            "dragend",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {
                if (ghostDrag!.tint === redTint) {
                    // invalid position - do nothing
                }
                else {
                    // valid position - move the platform and update the map
                    const oldPosKey = Editor.getPositionKey(new Phaser.Math.Vector2(platform.x, platform.y));
                    // remove all occupied tiles from map
                    for (let x = 0; x < platform.width; x += TILE_SIZE) {
                        for (let y = 0; y < platform.height; y += TILE_SIZE) {
                            const posKey = Editor.getPositionKey(new Phaser.Math.Vector2(platform.x + x, platform.y + y));
                            this.gameObjMap.delete(posKey);
                        }
                    }
                    platform.x = ghostDrag!.x;
                    platform.y = ghostDrag!.y;
                    // add all newly occupied tiles to map
                    for (let x = 0; x < platform.width; x += TILE_SIZE) {
                        for (let y = 0; y < platform.height; y += TILE_SIZE) {
                            const posKey = Editor.getPositionKey(new Phaser.Math.Vector2(platform.x + x, platform.y + y));
                            this.gameObjMap.set(posKey, { entityType: 'platform', gameObject: platform });
                        }
                    }

                    // if there was a platform below before the drag - remove this platform from its objectsOnIt set
                    platformBelowBeforeDrag?.removeObjectOnIt(platform);
                    // if there is a platform below after the drag - add this platform to its objectsOnIt set
                    const platformBelowAfterDrag = this.getPlatformBelow(new Phaser.Math.Vector2(platform.x, platform.y));
                    platformBelowAfterDrag?.addObjectOnIt(platform);
                }
                ghostDrag!.destroy();
                ghostDrag = null;
                this.selectObject(platform);
            }
        );

    }

    private handleEnemyDrag(enemy: Phaser.GameObjects.Image) {
        let ghostDrag: Phaser.GameObjects.Image | null = null;
        const platformBelowBeforeDrag: Platform | null = this.getPlatformBelow(new Phaser.Math.Vector2(enemy.x, enemy.y));

        // Drag events

        enemy.on(
            "dragstart",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                ghostDrag = this.add.image(enemy.x, enemy.y, 'enemy').setOrigin(0, 0);
                ghostDrag.setAlpha(0.5);
                this.deselectObject();
            }
        );
        enemy.on(
            "drag",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                // position the ghost at the snapped position
                const snappedPos = this.getSnappedCellPosition(pointer.worldX, pointer.worldY);
                ghostDrag!.x = snappedPos.x;
                ghostDrag!.y = snappedPos.y;

                // tint red when ghost overlaps or is not directly above a platform
                const posKey = Editor.getPositionKey(snappedPos);
                if (this.gameObjMap.has(posKey) || !this.getPlatformBelow(snappedPos)) {
                    ghostDrag!.setTint(redTint);
                } else {
                    ghostDrag!.clearTint();
                }
            }
        );
        enemy.on(
            "dragend",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {
                if (ghostDrag!.tint === redTint) {
                    // invalid position - do nothing
                }
                else {
                    // valid position - move the enemy and update the map
                    const oldPosKey = Editor.getPositionKey(new Phaser.Math.Vector2(enemy.x, enemy.y));
                    this.gameObjMap.delete(oldPosKey);
                    enemy.x = ghostDrag!.x;
                    enemy.y = ghostDrag!.y;
                    const newPosKey = Editor.getPositionKey(new Phaser.Math.Vector2(enemy.x, enemy.y));
                    this.gameObjMap.set(newPosKey, { entityType: 'enemy', gameObject: enemy });

                    // if there was a platform below before the drag - remove this platform from its objectsOnIt set
                    platformBelowBeforeDrag?.removeObjectOnIt(enemy);
                    // if there is a platform below after the drag - add this platform to its objectsOnIt set
                    const platformBelowAfterDrag = this.getPlatformBelow(new Phaser.Math.Vector2(enemy.x, enemy.y));
                    platformBelowAfterDrag?.addObjectOnIt(enemy);
                }
                ghostDrag!.destroy();
                ghostDrag = null;
                this.selectObject(enemy);
            }
        );
    }

    private handleCoinDrag(coin: Phaser.GameObjects.Image) {
        let ghostDrag: Phaser.GameObjects.Image | null = null;
        const platformBelowBeforeDrag: Platform | null = this.getPlatformBelow(new Phaser.Math.Vector2(coin.x, coin.y));

        // Drag events

        coin.on(
            "dragstart",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                ghostDrag = this.add.image(coin.x, coin.y, 'coin').setOrigin(0, 0);
                ghostDrag.setAlpha(0.5);
                this.deselectObject();
            }
        );
        coin.on(
            "drag",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                // position the ghost at the snapped position
                const snappedPos = this.getSnappedCellPosition(pointer.worldX, pointer.worldY);
                ghostDrag!.x = snappedPos.x;
                ghostDrag!.y = snappedPos.y;

                // if overlap with existing object, make ghost red
                const posKey = Editor.getPositionKey(snappedPos);
                if (this.gameObjMap.has(posKey)) {
                    ghostDrag!.setTint(redTint);
                } else {
                    ghostDrag!.clearTint();
                }
            }
        );
        coin.on(
            "dragend",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {
                if (ghostDrag!.tint === redTint) {
                    // invalid position - do nothing
                }
                else {
                    // valid position - move the coin and update the map
                    const oldPosKey = Editor.getPositionKey(new Phaser.Math.Vector2(coin.x, coin.y));
                    this.gameObjMap.delete(oldPosKey);
                    coin.x = ghostDrag!.x;
                    coin.y = ghostDrag!.y;
                    const newPosKey = Editor.getPositionKey(new Phaser.Math.Vector2(coin.x, coin.y));
                    this.gameObjMap.set(newPosKey, { entityType: 'coin', gameObject: coin });

                    // if there was a platform below before the drag - remove this platform from its objectsOnIt set
                    platformBelowBeforeDrag?.removeObjectOnIt(coin);
                    // if there is a platform below after the drag - add this platform to its objectsOnIt set
                    const platformBelowAfterDrag = this.getPlatformBelow(new Phaser.Math.Vector2(coin.x, coin.y));
                    platformBelowAfterDrag?.addObjectOnIt(coin);
                }
                ghostDrag!.destroy();
                ghostDrag = null;
                this.selectObject(coin);
            }
        );

    }

    private handleFlagDrag(flag: Phaser.GameObjects.Image, entityType: EntityType) {
        let ghostDrag: Phaser.GameObjects.Image | null = null;
        const platformBelowBeforeDrag: Platform | null = this.getPlatformBelow(new Phaser.Math.Vector2(flag.x, flag.y + TILE_SIZE));

        // Drag events

        flag.on(
            "dragstart",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                if (entityType === 'checkpoint') {
                    ghostDrag = this.add.image(flag.x, flag.y, 'checkpoint-flag', 4).setOrigin(0, 0);
                    this.checkpoints.add(ghostDrag);
                } else { // 'start-flag' or 'end-flag'
                    ghostDrag = this.add.image(flag.x, flag.y, entityType).setOrigin(0, 0);
                    if (entityType === 'start-flag') {
                        this.startFlag = ghostDrag;
                    } else { // 'end-flag'
                        this.endFlag = ghostDrag;
                    }
                }

                ghostDrag.setAlpha(0.5);
                this.deselectObject();
            }
        );
        flag.on(
            "drag",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                // position the ghost at the snapped position
                const snappedPos = this.getSnappedCellPosition(pointer.worldX, pointer.worldY);
                ghostDrag!.x = snappedPos.x;
                ghostDrag!.y = snappedPos.y;

                // if ghost cannot be placed tint red
                const posKey = Editor.getPositionKey(snappedPos);
                if (this.gameObjMap.has(posKey) || !this.canFlagBePlacedAt(snappedPos)) {
                    ghostDrag!.setTint(redTint);
                } else {
                    ghostDrag!.clearTint();
                }
            }
        );
        flag.on(
            "dragend",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {
                if (ghostDrag!.tint === redTint) {
                    // invalid position - do nothing
                }
                else {
                    // valid position - move the platform and update the map
                    const oldPosKey = Editor.getPositionKey(new Phaser.Math.Vector2(flag.x, flag.y));
                    // remove all occupied tiles from map
                    for (let x = 0; x < flag.width; x += TILE_SIZE) {
                        for (let y = 0; y < flag.height; y += TILE_SIZE) {
                            const posKey = Editor.getPositionKey(new Phaser.Math.Vector2(flag.x + x, flag.y + y));
                            this.gameObjMap.delete(posKey);
                        }
                    }

                    flag.x = ghostDrag!.x;
                    flag.y = ghostDrag!.y;
                    // add all newly occupied tiles to map
                    for (let x = 0; x < flag.width; x += TILE_SIZE) {
                        for (let y = 0; y < flag.height; y += TILE_SIZE) {
                            const posKey = Editor.getPositionKey(new Phaser.Math.Vector2(flag.x + x, flag.y + y));
                            this.gameObjMap.set(posKey, { entityType: entityType, gameObject: flag });
                        }
                    }

                    // if there was a platform below before the drag - remove this platform from its objectsOnIt set
                    platformBelowBeforeDrag?.removeObjectOnIt(flag);
                    // if there is a platform below after the drag - add this platform to its objectsOnIt set
                    const platformBelowAfterDrag = this.getPlatformBelow(new Phaser.Math.Vector2(flag.x, flag.y + TILE_SIZE));
                    platformBelowAfterDrag?.addObjectOnIt(flag);
                }
                ghostDrag!.destroy();
                ghostDrag = null;
                this.selectObject(flag);
            }
        );
    }

    /* ---- HELPERS ---- */
    private canFlagBePlacedAt(pos: Phaser.Math.Vector2): boolean {
        /* A flag can be placed if:
            - The tile for its bottom part is empty.
            - There is a platform two tiles below its top part (i.e., directly under its bottom part).
        */
        const tileBelowPos = new Phaser.Math.Vector2(pos.x, pos.y + TILE_SIZE);
        const tileBelowPosKey = Editor.getPositionKey(tileBelowPos);

        // The tile for the bottom part of the flag must be empty,
        // and there must be a platform below that.
        return !this.gameObjMap.has(tileBelowPosKey) && (!!this.getPlatformBelow(tileBelowPos));
    }

    private getPlatformBelow(pos: Phaser.Math.Vector2): Platform | null {
        const posBelowKey = Editor.getPositionKey(new Phaser.Math.Vector2(pos.x, pos.y + TILE_SIZE));
        const editorEntity = this.gameObjMap.get(posBelowKey);
        return editorEntity?.entityType === 'platform' ? editorEntity.gameObject as Platform : null;
    }








    // private createCompositePlatform(x: number, y: number, width: number, height: number) {
    //     const myPlatform = new Platform(this, x, y, width, height);

    //     // IMPORTANT: You make the CONTAINER interactive, not its children.
    //     // myPlatform.setInteractive();
    //     // this.input.setDraggable(myPlatform);

    //     // Add it to your data model just like before
    //     // (You'd add properties to the Platform class or manage it in a separate data object)
    // }
}
