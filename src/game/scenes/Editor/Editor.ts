import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';

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

    private addEntity({entityType, x, y}: {entityType: EntityType, x: number, y: number}) {
        // Logic to add the entity to the scene
        console.log('Adding entity:', entityType, 'at', x, y);
        switch(entityType) {
            case 'platform':
                console.log('Adding platform at', x, y);
                this.addPlatform(x, y);
                break;
            case 'enemy':
                // todo
                break;
            case 'coin':
                // todo
                break;
        }
    }

    private addPlatform(x: number, y: number) {
        this.platforms.create(x, y, 'platform');
    }

}