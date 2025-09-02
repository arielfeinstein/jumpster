import { Scene } from 'phaser';

import { EventBus } from '../../EventBus';

export class Editor extends Scene {

    private platforms: Phaser.Physics.Arcade.StaticGroup;

    constructor() {
        super('Editor');
    }

    create() {
        this.add.image(400, 600, 'background');

        EventBus.on('editor-place-entity', this.addEntity, this);
        
        this.platforms = this.physics.add.staticGroup();

        // Close EventBus listener
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('editor-place-entity', this.addEntity, this);
        });

        EventBus.emit('current-scene-ready', this);
    }

    private addEntity({entityType, x, y}: {entityType: string, x: number, y: number}) {
        // Logic to add the entity to the scene
        console.log('x: ' + x + ', y: ' + y, entityType);
        // primitive: just to see if it works, remove later
        this.platforms.create(x, y, 'star');
    }

}