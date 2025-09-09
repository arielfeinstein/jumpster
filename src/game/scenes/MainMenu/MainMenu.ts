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
        // Fill the visible canvas with the background
        const vw = this.scale.width;
        const vh = this.scale.height;
        this.add
            .image(0, 0, 'background')
            .setOrigin(0, 0)
            .setDisplaySize(vw, vh)
            .setScrollFactor(0)
            .setDepth(-10);

        
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
