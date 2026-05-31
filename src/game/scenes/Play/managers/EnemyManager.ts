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
        for (const data of enemyEntities) {
            const enemy = this.createEnemy(data, groups);
            if (!enemy) continue;

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
        this.enemies.delete(enemy);
        this.enemyGroup.remove(enemy, false, false); // keep in scene for death animation
        enemy.kill(); // handles animation + destroy
    }

    getEnemies(): Set<Enemy> {
        return this.enemies;
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
