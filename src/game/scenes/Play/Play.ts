/**
 * Play.ts — Play scene orchestrator.
 *
 * Responsibilities:
 *   - Build the world from level data (background, physics groups, entities)
 *   - Instantiate all managers and the collision controller
 *   - Wire manager callbacks to EventBus (all React communication centralised here)
 *   - Tick managers each frame
 *   - Handle pause (ESC key)
 *
 * This scene stays thin — all gameplay logic lives in the managers and controllers.
 */

import { EventBus } from '../../EventBus';
import { Scene } from 'phaser';
import Player from './Player';
import { LevelData, EntityData, EnemyData, CoinData } from '../../shared/types/LevelData';
import { EntityType } from '../../shared/types/EntityType';
import { createBackground } from '../../shared/utils/BackgroundUtils';
import { PlayPhysicsGroups } from '../../shared/types/PlayPhysicsGroups';
import EntityRegistry from '../../shared/registry/EntityRegistry';

import HealthManager from './managers/HealthManager';
import CoinManager from './managers/CoinManager';
import CheckpointManager from './managers/CheckpointManager';
import EnemyManager from './managers/EnemyManager';
import CollisionController from './controllers/CollisionController';

const MAX_HP = 3;

/** Entity types that are loaded as static physics bodies (no manager, no AI). */
const STATIC_ENTITY_TYPES: EntityType[] = ['platform', 'spikes', 'checkpoint', 'end-flag'];

export class Play extends Scene {

    private camera!: Phaser.Cameras.Scene2D.Camera;
    private background!: Phaser.GameObjects.TileSprite;
    private player!: Player;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private groups!: PlayPhysicsGroups;

    // Managers
    private healthManager!: HealthManager;
    private coinManager!: CoinManager;
    private checkpointManager!: CheckpointManager; // created in buildWorld() once spawn is known
    private enemyManager!: EnemyManager;

    // Controllers
    // Prefixed with _ because it is stored only to prevent GC — all work happens in its constructor.
    private _collisionController!: CollisionController;

    constructor() {
        super('Play');
    }

    preload() {
        // Explicitly load dev level inside Play for early development
        this.load.json('level1', 'dev_tmp/level1.json');
    }

    create() {
        this.camera = this.cameras.main;
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Physics groups — created here, passed to managers/controllers that need them
        this.groups = {
            solid:       this.physics.add.staticGroup(),
            hazard:      this.physics.add.staticGroup(),
            collectible: this.physics.add.staticGroup(),
            checkpoint:  this.physics.add.staticGroup(),
            goal:        this.physics.add.staticGroup(),
            enemy:       this.physics.add.group({ allowGravity: true }),
        };

        // Managers that don't depend on level data are created here.
        // CheckpointManager is created in buildWorld() once the spawn position is known.
        this.healthManager = new HealthManager(MAX_HP);
        this.coinManager = new CoinManager(this, this.groups.collectible);
        this.enemyManager = new EnemyManager(this, this.groups.enemy);

        // Wire callbacks → EventBus (all React communication in one place).
        // onDied is wired in buildWorld() after CheckpointManager exists.
        this.healthManager.onHealthChanged = (hp, maxHp) => {
            EventBus.emit('play-health-changed', { hp, maxHp });
        };
        this.coinManager.onCoinsChanged = (collected, total) => {
            EventBus.emit('play-coins-changed', { collected, total });
        };

        // TODO: wire pause (ESC key) → EventBus.emit('play-paused') + this.scene.pause()

        if (this.load.isLoading()) {
            this.load.once('complete', () => this.buildWorld());
        } else {
            this.buildWorld();
        }
    }

    private buildWorld() {
        const levelData = this.cache.json.get('level1') as LevelData | undefined;

        if (!levelData) {
            console.error('Play Scene: levelData (level1.json) not found in cache. Returning to MainMenu.');
            this.scene.start('MainMenu');
            return;
        }

        // World bounds
        const vw = this.scale.width;
        const vh = this.scale.height;
        const worldW = (levelData.worldWidthUnit || 1) * vw;
        const worldH = (levelData.worldHeightUnit || 1) * vh;
        this.physics.world.setBounds(0, 0, worldW, worldH);
        this.camera.setBounds(0, 0, worldW, worldH);

        // Background
        this.background = createBackground(this, levelData.background ?? 0);
        this.background.setAlpha(0.5);

        const entities = levelData.entities ?? [];

        // Resolve spawn position first so CheckpointManager is created once with the real value.
        // Editor enforces exactly one start-flag; we fall back to a safe default just in case.
        const spawnEntity = entities.find(e => e.entityType === 'start-flag');
        const spawnX = spawnEntity?.x ?? 100;
        const spawnY = spawnEntity?.y ?? 300;

        // CheckpointManager created here (once) with the real spawn position
        this.checkpointManager = new CheckpointManager(spawnX, spawnY, this.healthManager, this.coinManager);
        this.healthManager.onDied = () => this.checkpointManager.respawn();

        // Load entities — each system handles its own types
        this.loadStaticEntities(entities);
        this.coinManager.loadFromLevelData(
            entities.filter((e): e is CoinData => e.entityType === 'coin'),
        );
        this.enemyManager.loadFromLevelData(
            entities.filter((e): e is EnemyData => e.entityType === 'enemy'),
            this.groups.solid.getChildren(),
        );

        // Player
        this.player = new Player(this, spawnX, spawnY);
        this.checkpointManager.setPlayer(this.player);
        this.camera.startFollow(this.player, true, 0.1, 0.1);

        // Collision controller — registers all physics interactions
        this._collisionController = new CollisionController(
            this,
            this.player,
            this.groups,
            this.healthManager,
            this.coinManager,
            this.checkpointManager,
            this.enemyManager,
        );

        EventBus.emit('current-scene-ready', this);
    }

    /**
     * Creates static (non-managed) entities from level data and adds them to
     * their physics groups.  These entities have no runtime state — they are
     * placed once and never updated.
     *
     * Coins and enemies are intentionally excluded: CoinManager and EnemyManager
     * own their own loading so they can track entity IDs and lifecycle.
     */
    private loadStaticEntities(entities: EntityData[]): void {
        for (const data of entities.filter(e => STATIC_ENTITY_TYPES.includes(e.entityType))) {
            const entity = EntityRegistry.create(this, data);

            const collidables = entity.getCollidables();

            switch (data.entityType) {
                case 'platform':   this.groups.solid.addMultiple(collidables);      break;
                case 'spikes':     this.groups.hazard.addMultiple(collidables);     break;
                case 'checkpoint': this.groups.checkpoint.addMultiple(collidables); break;
                case 'end-flag':   this.groups.goal.addMultiple(collidables);       break;
            }
        }
    }

    update(_time: number, delta: number) {
        if (!this.player) return;

        this.player.update(this.cursors);
        this.enemyManager.update(delta);

        // TODO: check ESC for pause
    }

    changeScene() {
        this.scene.start('GameOver');
    }
}
