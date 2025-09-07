import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';




export class Editor extends Scene {

    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    grid: Phaser.GameObjects.Grid;

    constructor() {
        super('Editor');
    }

    create() {
        this.add.image(400, 300, 'background').setScrollFactor(0).setDepth(-10);

        this.grid = this.add.grid(0, 0, 800, 600, 40, 40).setOrigin(0,0);
        this.grid.setOutlineStyle(0x000000,1);

         this.cameras.main.setBounds(0, 0, 800, 600);
         this.physics.world.setBounds(0, 0, 800, 600);

        this.cursors = this.input.keyboard!.createCursorKeys();

        EventBus.on('editor-change-dimensions', this.changeDimensions, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('editor-change-dimensions', this.changeDimensions, this);
        });

        EventBus.emit('current-scene-ready', this);
    }

    update() {


        // handle camera scroll
        if (this.cursors.left.isDown) {
            this.cameras.main.scrollX -= 40;
        }
        else if (this.cursors.right.isDown) {
            this.cameras.main.scrollX += 40;
        }

        if (this.cursors.up.isDown) {
            this.cameras.main.scrollY -= 40;
        }

        if (this.cursors.down.isDown) {
            this.cameras.main.scrollY += 40;
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
    changeDimensions({worldWidthUnit, worldHeightUnit}: {worldWidthUnit: number, worldHeightUnit: number}) {
        if (worldWidthUnit <= 0 || worldHeightUnit <= 0) return;
        const width = 800*worldWidthUnit;
        const height = 600*worldHeightUnit;
        this.cameras.main.setBounds(0, 0, width, height);
        this.physics.world.setBounds(0, 0, width, height);
        this.grid.width = width;
        this.grid.height = height;
    }








}