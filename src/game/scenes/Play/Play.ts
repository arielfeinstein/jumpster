import { EventBus } from '../../EventBus';
import { Scene } from 'phaser';
import Player from './Player';
import LevelSerializer from '../../shared/serialization/LevelSerializer';
import { LevelData } from '../../shared/types/LevelData';
import { createBackground } from '../../shared/utils/BackgroundUtils';
import { PlayPhysicsGroups } from '../../shared/types/PlayPhysicsGroups';

export class Play extends Scene {
    private camera!: Phaser.Cameras.Scene2D.Camera;
    private background!: Phaser.GameObjects.TileSprite;
    private player!: Player;

    private solidGroup!: Phaser.Physics.Arcade.StaticGroup;
    private hazardGroup!: Phaser.Physics.Arcade.StaticGroup;
    private collectibleGroup!: Phaser.Physics.Arcade.StaticGroup;
    private checkpointGroup!: Phaser.Physics.Arcade.StaticGroup;
    private goalGroup!: Phaser.Physics.Arcade.StaticGroup;
    private stompableGroup!: Phaser.Physics.Arcade.Group;

    constructor() {
        super('Play');
    }

    preload() {
        // Explicitly load dev level inside Play for early development
        this.load.json('level1', 'dev_tmp/level1.json');
    }

    create() {
        this.camera = this.cameras.main;

        // Physics groups
        this.solidGroup = this.physics.add.staticGroup();
        this.hazardGroup = this.physics.add.staticGroup();
        this.collectibleGroup = this.physics.add.staticGroup();
        this.checkpointGroup = this.physics.add.staticGroup();
        this.goalGroup = this.physics.add.staticGroup();
        this.stompableGroup = this.physics.add.group({ allowGravity: true });

        // Listen for the loader to complete before building the world
        // This ensures level1.json is actually in the cache
        if (this.load.isLoading()) {
            this.load.once('complete', () => this.buildWorld());
        } else {
            // If already loaded (e.g. from a previous scene or cache), build immediately
            this.buildWorld();
        }
    }

    private buildWorld() {
        // Try load level data
        const levelData = this.cache.json.get('level1') as LevelData | undefined;

        // Default spawn point if no 'spawn' checkpoint is found in the entities.
        // Editor should enforce that exactly one spawn point exists, but we fall back to a safe default just in case.
        let spawnX = 100;
        let spawnY = 300;

        if (!levelData) {
            console.error('Play Scene: levelData (level1.json) not found in cache. Returning to MainMenu.');
            this.scene.start('MainMenu');
            return;
        }

        // Setup world bounds
        const vw = this.scale.width;
        const vh = this.scale.height;
        const worldW = (levelData.worldWidthUnit || 1) * vw;
        const worldH = (levelData.worldHeightUnit || 1) * vh;

        this.physics.world.setBounds(0, 0, worldW, worldH);
        this.camera.setBounds(0, 0, worldW, worldH);

        // Add background based on level data using shared utility
        const bgKey = levelData.background ?? 0;
        this.background = createBackground(this, bgKey);
        this.background.setAlpha(0.5);

        // Parse Entities
        if (levelData.entities) {
            const spawn = LevelSerializer.deserializeForPlay(levelData, this, {
                solid: this.solidGroup,
                hazard: this.hazardGroup,
                collectible: this.collectibleGroup,
                checkpoint: this.checkpointGroup,
                goal: this.goalGroup,
                stompable: this.stompableGroup
            });

            spawnX = spawn.spawnX;
            spawnY = spawn.spawnY;
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

    update() {
        const cursors = this.input.keyboard?.createCursorKeys();
        if (cursors && this.player) {
            this.player.update(cursors);
        }
    }

    changeScene() {
        this.scene.start('GameOver');
    }
}
