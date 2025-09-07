import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';




export class Editor extends Scene {

    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('Editor');
    }

    create() {
        this.add.image(400, 300, 'background').setScrollFactor(0).setDepth(-10);

        const g1 = this.add.grid(0, 0, 800, 600, 40, 40).setOrigin(0,0)
        g1.setOutlineStyle(0x000000,1);

         this.cameras.main.setBounds(0, 0, 800, 600);
         this.physics.world.setBounds(0, 0, 800, 600);

        this.cursors = this.input.keyboard!.createCursorKeys();


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








}