import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';
import { TILE_SIZE } from '../../config';




export class Editor extends Scene {

    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    grid: Phaser.GameObjects.Grid;

    gameObjects: Phaser.GameObjects.Group;
    platforms: Phaser.GameObjects.Group;
    enemies: Phaser.GameObjects.Group;
    coins: Phaser.GameObjects.Group;
    checkpoints: Phaser.GameObjects.Group;
    // todo: starting flag
    // todo: ending flag


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

        this.gameObjects = this.add.group();

        this.cursors = this.input.keyboard!.createCursorKeys();

        EventBus.on('editor-change-dimensions', this.changeDimensions, this);
        EventBus.on('editor-place-entity', this.addEntityTest, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('editor-change-dimensions', this.changeDimensions, this);
            EventBus.off('editor-place-entity', this.addEntityTest, this);
        });

        this.initGroups();
        // continue from here

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
        switch (entityType) {
            case 'platform':

        }
    }

    /* Test method to visualize entity placement and grid snapping */
    private addEntityTest({ entityType, x, y }: { entityType: EntityType, x: number, y: number }) {
        const topLeftSnappedPos: Phaser.Math.Vector2 = this.getSnappedCellPosition(x, y);
        //this.add.rectangle(topLeftSnappedPos.x, topLeftSnappedPos.y, TILE_SIZE, TILE_SIZE, 0xff0000, 0.5).setOrigin(0, 0);
        //const flag = this.add.sprite(topLeftSnappedPos.x, topLeftSnappedPos.y, 'checkpoint-flag').setOrigin(0,0);
        this.add.image(topLeftSnappedPos.x, topLeftSnappedPos.y, 'end-flag').setOrigin(0, 0);
        console.log(`Placing entity '${entityType}' at world coords (${x}, ${y}), snapped to (${topLeftSnappedPos.x}, ${topLeftSnappedPos.y})`);
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

    private initGroups() {
        this.gameObjects = this.add.group();
        this.platforms = this.add.group();
        this.enemies = this.add.group();
        this.coins = this.add.group();
        this.checkpoints = this.add.group();
    }
}
