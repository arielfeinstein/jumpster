import { Scene } from 'phaser';

import { EventBus } from '../../EventBus';

export class Editor extends Scene {
    constructor() {
        super('Editor');
    }

    create() {
        //this.add.image(400, 600, 'background');

        

        EventBus.emit('current-scene-ready', this);
    }
}