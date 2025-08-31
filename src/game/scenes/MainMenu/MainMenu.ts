import { Scene } from 'phaser';

import { EventBus } from '../../EventBus';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.add.image(400, 600, 'background');

        
        const createLevelHandler = () => {
            console.log('Create level requested');
            this.scene.start('Editor');
        };

        // EventBus listener
        EventBus.on('create-level', createLevelHandler, this);

        // Close EventBus listener
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('create-level', createLevelHandler, this);
        });

        EventBus.emit('current-scene-ready', this);
    }
}
