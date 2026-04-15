/**
 * CollisionController.ts
 *
 * Single place where all Arcade physics colliders and overlaps are registered.
 * Routes collision outcomes to the appropriate manager — it does not own any
 * state itself.
 *
 * Responsibilities:
 *   - Wire player ↔ solid (collider — player stands/bumps)
 *   - Wire player ↔ hazard (overlap — any contact = damage)
 *   - Wire player ↔ collectible (overlap = coin collected)
 *   - Wire player ↔ checkpoint (overlap = snapshot saved)
 *   - Wire player ↔ goal (overlap = win condition)
 *   - Wire player ↔ enemy (overlap = stomp check OR damage)
 *
 * Stomp detection logic lives here as a private method because it is purely a
 * collision concern — it does not belong in Player (which handles animation/
 * movement) or HealthManager (which handles HP).
 */

import Phaser from 'phaser';
import { PlayPhysicsGroups } from '../../../shared/types/PlayPhysicsGroups';
import Player from '../Player';
import HealthManager from '../managers/HealthManager';
import CoinManager from '../managers/CoinManager';
import CheckpointManager from '../managers/CheckpointManager';
import EnemyManager from '../managers/EnemyManager';
import Enemy from '../enemies/Enemy';

export default class CollisionController {

    private readonly scene: Phaser.Scene;
    private readonly player: Player;
    private readonly groups: PlayPhysicsGroups;
    private readonly healthManager: HealthManager;
    private readonly coinManager: CoinManager;
    private readonly checkpointManager: CheckpointManager;
    private readonly enemyManager: EnemyManager;

    constructor(
        scene: Phaser.Scene,
        player: Player,
        groups: PlayPhysicsGroups,
        healthManager: HealthManager,
        coinManager: CoinManager,
        checkpointManager: CheckpointManager,
        enemyManager: EnemyManager,
    ) {
        this.scene = scene;
        this.player = player;
        this.groups = groups;
        this.healthManager = healthManager;
        this.coinManager = coinManager;
        this.checkpointManager = checkpointManager;
        this.enemyManager = enemyManager;

        this.setupColliders();
    }

    // ─── Setup ──────────────────────────────────────────────────────────────────

    private setupColliders(): void {
        const { scene, player, groups } = this;

        // Player stands on / bumps platforms
        scene.physics.add.collider(player, groups.solid);

        // Hazards (spikes) — any contact = damage
        scene.physics.add.overlap(player, groups.hazard, () => {
            this.onHazardContact();
        });

        // Collectibles (coins)
        scene.physics.add.overlap(player, groups.collectible, (_p, coin) => {
            this.onCoinCollected(coin as Phaser.GameObjects.GameObject);
        });

        // Checkpoints
        scene.physics.add.overlap(player, groups.checkpoint, (_p, checkpoint) => {
            this.onCheckpointReached(checkpoint as Phaser.GameObjects.GameObject);
        });

        // Goal (end flag)
        scene.physics.add.overlap(player, groups.goal, () => {
            this.onGoalReached();
        });

        // Enemies — could be stomp or damage depending on direction.
        scene.physics.add.overlap(player, groups.enemy, (_p, enemy) => {
            if (enemy instanceof Enemy) {
                this.onEnemyContact(enemy);
            }
        });
    }

    // ─── Handlers ───────────────────────────────────────────────────────────────

    private onHazardContact(): void {
        this.healthManager.takeDamage(1);
        // TODO: trigger player hit animation via player.takeDamage()
    }

    private onCoinCollected(coinObject: Phaser.GameObjects.GameObject): void {
        // TODO: retrieve stable entity ID from the coin object.
        // Coins must store their entity ID via setData('entityId', id) when created.
        const coinId = coinObject.getData?.('entityId') as string ?? '';
        this.coinManager.collect(coinId, coinObject);
        // TODO: play coin collect sound / animation
    }

    private onCheckpointReached(checkpointObject: Phaser.GameObjects.GameObject): void {
        // Checkpoint entities use Image as their display object, so x/y are available.
        const { x, y } = checkpointObject as Phaser.GameObjects.Image;
        this.checkpointManager.onCheckpointReached(x, y);
    }

    private onGoalReached(): void {
        // TODO: trigger win sequence — pause player input, play animation, emit to React
        // EventBus.emit('play-level-complete');
        console.log('Level complete!');
    }

    private onEnemyContact(enemy: Enemy): void {
        const result = enemy.handlePlayerContact(this.player, {
            isStomping: this.isStomping(enemy),
        });

        switch (result) {
            case 'enemy-killed':
                this.enemyManager.killEnemy(enemy);
                // TODO: bounce player upward after stomp
                break;
            case 'player-damaged':
                this.healthManager.takeDamage(1);
                // TODO: trigger player hit animation via player.takeDamage()
                break;
            case 'none':
                break;
        }
    }

    // ─── Stomp detection ────────────────────────────────────────────────────────

    /**
     * Returns true if the player is falling onto the TOP of the enemy.
     *
     * Stomp conditions (both must be true):
     *   1. Player is moving downward (velocity.y > 0)
     *   2. Player's bottom edge is at or above the enemy's center
     *      (ensures we only count hits from above, not side-contacts that
     *      happen while already falling past the enemy)
     */
    private isStomping(enemy: Enemy): boolean {
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;

        const playerFalling = playerBody.velocity.y > 0;
        const playerAboveCenter = playerBody.bottom <= enemyBody.center.y + 8; // small tolerance

        return playerFalling && playerAboveCenter;
    }
}
