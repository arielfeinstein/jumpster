import { EventBus } from '../../EventBus';
import { Scene } from 'phaser';
import Player from './Player';
import LevelSerializer from '../../shared/serialization/LevelSerializer';
import { LevelData } from '../../shared/types/LevelData';
import EntityRegistry from '../../shared/registry/EntityRegistry';
import GameEntity from '../../shared/gameObjects/GameEntity';

export class Play extends Scene
{
    private camera!: Phaser.Cameras.Scene2D.Camera;
    private background!: Phaser.GameObjects.Image;
    private player!: Player;
    
    private solidGroup!: Phaser.Physics.Arcade.StaticGroup;
    private hazardGroup!: Phaser.Physics.Arcade.StaticGroup;
    private collectibleGroup!: Phaser.Physics.Arcade.StaticGroup;
    private checkpointGroup!: Phaser.Physics.Arcade.StaticGroup;
    private goalGroup!: Phaser.Physics.Arcade.StaticGroup;
    private stompableGroup!: Phaser.Physics.Arcade.Group;

    constructor ()
    {
        super('Play');
    }

    preload()
    {
        // Explicitly load dev level inside Play for early development
        this.load.json('level1', 'dev_tmp/level1.json');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);
        
        // Physics groups
        this.solidGroup = this.physics.add.staticGroup();
        this.hazardGroup = this.physics.add.staticGroup();
        this.collectibleGroup = this.physics.add.staticGroup();
        this.checkpointGroup = this.physics.add.staticGroup();
        this.goalGroup = this.physics.add.staticGroup();
        this.stompableGroup = this.physics.add.group({ allowGravity: true }); 

        // Try load level data
        const levelData = this.cache.json.get('level1') as LevelData | undefined;

        let spawnX = 100;
        let spawnY = 300;

        if (levelData) {
            // Setup world bounds
            const vw = this.scale.width;
            const vh = this.scale.height;
            const worldW = (levelData.worldWidthUnit || 1) * vw;
            const worldH = (levelData.worldHeightUnit || 1) * vh;

            this.physics.world.setBounds(0, 0, worldW, worldH);
            this.camera.setBounds(0, 0, worldW, worldH);

            // Add background based on level data
            const bgKey = levelData.background ?? 0;
            // Simple generic tile sprite for now, adjust later if complex
            this.background = this.add.image(0, 0, 'bg-tilesheet', bgKey)
                .setOrigin(0, 0)
                .setDisplaySize(worldW, worldH)
                .setDepth(-10);
            this.background.setAlpha(0.5);

            // Parse Entities
            if (levelData.entities) {
                for (const eData of levelData.entities) {
                    const entity = EntityRegistry.create(eData.entityType, this, eData.x, eData.y, eData.width, eData.height, eData.variant, eData.id);
                    
                    const collidables = entity.getCollidables();

                    // Map behavior to groups
                    switch (entity.playBehavior) {
                        case 'spawn':
                            spawnX = eData.x;
                            spawnY = eData.y;
                            break;
                        case 'solid':
                            this.solidGroup.addMultiple(collidables);
                            break;
                        case 'hazard':
                            this.hazardGroup.addMultiple(collidables);
                            break;
                        case 'stompable':
                            this.stompableGroup.addMultiple(collidables);
                            break;
                        case 'collectible':
                            this.collectibleGroup.addMultiple(collidables);
                            break;
                        case 'checkpoint':
                            this.checkpointGroup.addMultiple(collidables);
                            break;
                        case 'goal':
                            this.goalGroup.addMultiple(collidables);
                            break;
                    }
                }
            }
        } else {
            // Fallback empty background if json missing
            const vw = this.scale.width;
            const vh = this.scale.height;
            this.background = this.add
                .image(0, 0, 'background')
                .setOrigin(0, 0)
                .setDisplaySize(vw, vh)
                .setScrollFactor(0)
                .setDepth(-10);
            this.background.setAlpha(0.5);
            this.physics.world.setBounds(0, 0, vw, vh);
            this.camera.setBounds(0, 0, vw, vh);
            
            // Helpful text
            this.add.text(vw/2, vh/2, 'Level Data Missing.\nRefresh after creating dev_tmp/level1.json', {
                fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff',
                stroke: '#000000', strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5).setDepth(100);
        }

        // Initialize Player at spawn point
        this.player = new Player(this, spawnX, spawnY);
        this.camera.startFollow(this.player, true, 0.1, 0.1);

        // Colliders
        this.physics.add.collider(this.player, this.solidGroup);
        // We'll set up overlaps later when we need specific callbacks (like dying, taking damage, picking up coins)
        this.physics.add.overlap(this.player, this.collectibleGroup, (p, c) => {
            c.destroy(); // Temp coin pickup
        });

        EventBus.emit('current-scene-ready', this);
    }

    update()
    {
        const cursors = this.input.keyboard?.createCursorKeys();
        if (cursors) {
            this.player.update(cursors);
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
