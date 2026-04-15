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
        this.load.spritesheet('spikes', 'assets/phaser/spikes.png',
            {
                frameWidth: 32,
                frameHeight: 32,
                margin: 0,
                spacing: 64
            }
        );
        this.load.spritesheet('bg-tilesheet', 'assets/phaser/bg-tilesheet.png', {
            frameWidth: 32,
            frameHeight: 32,
        });

        // Load the player spritesheet
        this.load.spritesheet('fox', 'assets/phaser/fox.png', { frameWidth: 32, frameHeight: 32 });
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        this.anims.create({
            key: 'fox-idle',
            frames: this.anims.generateFrameNumbers('fox', { start: 0, end: 10 }),
            frameRate: 20,
            repeat: -1
        });

        this.anims.create({
            key: 'fox-jump',
            frames: [{ key: 'fox', frame: 11 }],
            frameRate: 10
        });

        this.anims.create({
            key: 'fox-fall',
            frames: [{ key: 'fox', frame: 12 }],
            frameRate: 10
        });

        this.anims.create({
            key: 'fox-hit-ground',
            frames: this.anims.generateFrameNumbers('fox', { start: 13, end: 17 }),
            frameRate: 20
        });

        this.anims.create({
            key: 'fox-run',
            frames: this.anims.generateFrameNumbers('fox', { start: 18, end: 29 }),
            frameRate: 20,
            repeat: -1
        });

        this.scene.start('Editor');
    }
}
