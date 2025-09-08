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
        //todo: this.load.image('start-flag', 'assets/phaser/start-flag.png');
        this.load.image('end-flag', 'assets/phaser/end-flag.png');
        this.load.image('platform', 'assets/phaser/platform.png');
        this.load.image('coin', 'assets/phaser/coin.png');
        
        // Spritesheets
        this.load.spritesheet('enemy', 'assets/react/enemy.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('dude', 'assets/phaser/dude.png', { frameWidth: 32, frameHeight: 48 });
        // todo: add checkpoint flag spritesheet

        

        //todo: load dude
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        //this.scene.start('MainMenu');

        //for easier work. change the mainmenu later.
        this.scene.start('Editor');
    }
}
