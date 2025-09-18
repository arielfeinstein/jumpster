import { Scene } from 'phaser';

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
        // Images
        this.load.image('start-flag', 'assets/phaser/start-flag.png');
        this.load.image('end-flag', 'assets/phaser/end-flag.png');
        this.load.image('coin', 'assets/phaser/coin.png');
        this.load.image('red-cross', 'assets/phaser/icon_outline_cross.png');
        
        // Spritesheets
        this.load.spritesheet('enemy', 'assets/phaser/enemy.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('dude', 'assets/phaser/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('checkpoint-flag', 'assets/phaser/checkpoint-flag.png', { frameWidth: 32, frameHeight: 64 });
        this.load.spritesheet('platform', 'assets/phaser/platform-tiles.png', {frameWidth: 32, frameHeight: 32});

        

        //todo: load dude
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        this.scene.start('Editor');
    }
}
