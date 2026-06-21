/**
 * EnemyManager.ts
 *
 * Owns the collection of live enemies and their full lifecycle:
 *   - Loading from level data and spawning the correct Enemy subclass per entry
 *   - Ticking each enemy's AI each frame
 *   - Killing enemies (removing from physics group and internal set)
 *
 * Each enemy type is responsible for its own full setup — it receives raw level
 * data and resolves environment queries (e.g. patrol bounds, flight paths) in its
 * own constructor.  EnemyManager stays generic: it holds Set<Enemy>, calls
 * enemy.update(delta) each frame, and never inspects enemy internals.
 *
 * Extensibility:
 *   To add a new enemy type, create a subclass of Enemy, register it here in
 *   createEnemy(), and add its EntityType to the switch.  EnemyManager itself
 *   stays generic (it holds Set<Enemy>, not Set<Goomba>).
 */

import Phaser from 'phaser';
import { EnemyData } from '../../../shared/types/LevelData';
import { PlayPhysicsGroups } from '../../../shared/types/PlayPhysicsGroups';
import Enemy from '../enemies/Enemy';
import Goomba from '../enemies/Goomba';

export default class EnemyManager {

    private readonly enemies: Set<Enemy> = new Set();
    private readonly scene: Phaser.Scene;
    private readonly enemyGroup: Phaser.Physics.Arcade.Group;

    /**
     * Original EnemyData for every enemy that was ever loaded, keyed by entity id.
     * Populated once in loadFromLevelData() and never mutated — used by respawnEnemies()
     * to recreate enemies from scratch with the same initial parameters.
     */
    private allEnemyData = new Map<string, EnemyData>();

    /**
     * IDs of enemies that are currently alive in the world.
     * Enemies are added here at load time and removed in killEnemy().
     * CheckpointManager reads this to snapshot the live set at each checkpoint.
     */
    private liveEnemyIds = new Set<string>();

    /**
     * Physics groups stored from the last loadFromLevelData() call.
     * respawnEnemies() needs these to re-create enemies with the same patrol bounds.
     */
    private loadedGroups: PlayPhysicsGroups | null = null;

    constructor(scene: Phaser.Scene, enemyGroup: Phaser.Physics.Arcade.Group) {
        this.scene = scene;
        this.enemyGroup = enemyGroup;
    }

    /**
     * Creates all enemies from level data and adds them to the enemy physics group.
     * Called once during Play.buildWorld() so EnemyManager can track live Arcade.Sprite instances.
     *
     * @param enemyEntities  EntityData entries with entityType === 'enemy'.
     * @param groups   All physics groups for the level, forwarded to each enemy so it
     *                 can compute patrol bounds and query any group it needs.
     */
    loadFromLevelData(
        enemyEntities: EnemyData[],
        groups: PlayPhysicsGroups,
    ): void {
        // Store groups so respawnEnemies() can recreate enemies later
        this.loadedGroups = groups;

        for (const data of enemyEntities) {
            const enemy = this.createEnemy(data, groups);
            if (!enemy) continue;

            // Record original data for potential future respawn
            this.allEnemyData.set(data.id, data);
            this.liveEnemyIds.add(data.id);

            this.enemies.add(enemy);
            this.enemyGroup.add(enemy);
            enemy.onReady();
        }
    }

    /** Called by Play.update() every frame. */
    update(delta: number): void {
        for (const enemy of this.enemies) {
            enemy.update(delta);
        }
    }

    /**
     * Removes an enemy from the world.  Called by CollisionController on stomp.
     * The enemy is responsible for its own death animation via kill().
     */
    killEnemy(enemy: Enemy): void {
        // Read the id before destroying, then mark it as no longer live
        this.liveEnemyIds.delete(enemy.id);
        this.enemies.delete(enemy);
        this.enemyGroup.remove(enemy, false, false); // keep in scene for death animation
        enemy.kill(); // handles animation + destroy
    }

    getEnemies(): Set<Enemy> {
        return this.enemies;
    }

    /**
     * Returns a defensive copy of the currently-alive enemy ID set.
     * Called by CheckpointManager to snapshot live enemies at each checkpoint.
     */
    getLiveEnemyIds(): Set<string> {
        return new Set(this.liveEnemyIds);
    }

    /**
     * Restores enemies that were alive at the last checkpoint but were killed after it.
     *
     * Strategy:
     *   - Any id in `liveAtCheckpoint` that is NOT currently in `liveEnemyIds` was killed
     *     between the checkpoint and the player's death — recreate it.
     *   - Any id in `liveAtCheckpoint` that IS still in `liveEnemyIds` survived; leave it alone.
     *
     * @param liveAtCheckpoint  The snapshot of live IDs taken when the checkpoint was reached.
     */
    respawnEnemies(liveAtCheckpoint: Set<string>): void {
        if (!this.loadedGroups) return;

        for (const id of liveAtCheckpoint) {
            if (this.liveEnemyIds.has(id)) continue; // still alive — nothing to do

            const data = this.allEnemyData.get(id);
            if (!data) continue;

            const enemy = this.createEnemy(data, this.loadedGroups);
            if (!enemy) continue;

            this.liveEnemyIds.add(id);
            this.enemies.add(enemy);
            this.enemyGroup.add(enemy);
            enemy.onReady();
        }
    }

    // ─── Private ────────────────────────────────────────────────────────────────

    /**
     * Factory — maps entity type string to the correct Enemy subclass.
     * Each enemy receives raw level data and handles its own setup internally.
     * Add new enemy types here as the game grows.
     */
    private createEnemy(data: EnemyData, groups: PlayPhysicsGroups): Enemy | null {
        switch (data.enemyType) {
            case 'goomba':
                return new Goomba(this.scene, data, groups);

            default:
                console.warn(`EnemyManager: unknown enemy type "${data.enemyType}"`);
                return null;
        }
    }
}
