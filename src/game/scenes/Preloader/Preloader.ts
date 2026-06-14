import { Scene } from 'phaser';
import AssetLoaderManager from '../../shared/managers/AssetLoaderManager';
import AnimationManager from '../../shared/managers/AnimationManager';
import { emitEvent } from '../../EventBus';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    preload ()
    {
        this.load.on('progress', (value: number) => {
            emitEvent('preloader-progress', { value });
        });

        this.load.on('complete', () => {
            emitEvent('preloader-complete', {});
        });

        AssetLoaderManager.loadAll(this);
    }

    create ()
    {
        AnimationManager.createAll(this);

        this.scene.start('MainMenu');
    }
}
