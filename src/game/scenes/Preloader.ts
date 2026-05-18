import { Scene } from 'phaser';
import AssetLoaderManager from '../shared/managers/AssetLoaderManager';
import AnimationManager from '../shared/managers/AnimationManager';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        //this.add.image(512, 384, 'background');
    }

    preload ()
    {
        AssetLoaderManager.loadAll(this);
    }

    create ()
    {
        AnimationManager.createAll(this);

        this.scene.start('Play');
    }
}
