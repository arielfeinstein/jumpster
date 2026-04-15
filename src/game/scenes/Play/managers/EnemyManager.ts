/**
 * EnemyManager.ts
 *
 * Owns the collection of live enemies and their full lifecycle:
 *   - Loading from level data and spawning the correct Enemy subclass per entry
 *   - Ticking each enemy's AI each frame
 *   - Killing enemies (removing from physics group and internal set)
 *
 * Each enemy type is responsible for its own setup inside createEnemy().
 * For example, Goomba computes patrol bounds there; a future FlyingEnemy
 * would compute a flight path there instead.  The load loop stays generic.
 *
 * Extensibility:
 *   To add a new enemy type, create a subclass of Enemy, register it here in
 *   createEnemy(), and add its EntityType to the switch.  EnemyManager itself
 *   stays generic (it holds Set<Enemy>, not Set<Goomba>).
 */

import Phaser from 'phaser';
import { EnemyData } from '../../../shared/types/LevelData';
import Enemy, { PatrolBounds } from '../enemies/Enemy';
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
     * @param solidObjects   All solid Phaser objects in the level, used for patrol bound computation.
     */
    loadFromLevelData(
        enemyEntities: EnemyData[],
        solidObjects: Phaser.GameObjects.GameObject[],
    ): void {
        for (const data of enemyEntities) {
            const enemy = this.createEnemy(data, solidObjects);
            if (!enemy) continue;

            this.enemies.add(enemy);
            this.enemyGroup.add(enemy);
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
        this.enemyGroup.remove(enemy, true, false); // keep in scene for death animation
        enemy.kill(); // handles animation + destroy
    }

    getEnemies(): Set<Enemy> {
        return this.enemies;
    }

    // ─── Private ────────────────────────────────────────────────────────────────

    /**
     * Factory — maps entity type string to the correct Enemy subclass.
     * Each case is responsible for its own type-specific setup (e.g. patrol
     * bounds for Goomba, flight path for a future FlyingEnemy).
     * Add new enemy types here as the game grows.
     */
    private createEnemy(data: EnemyData, solidObjects: Phaser.GameObjects.GameObject[]): Enemy | null {
        switch (data.enemyType) {
            case 'goomba': {
                const patrolBounds = this.computePatrolBounds(data, solidObjects);
                return new Goomba(this.scene, data.x, data.y, data.variant ?? 'default', patrolBounds);
            }

            default:
                console.warn(`EnemyManager: unknown enemy type "${data.enemyType}"`);
                return null;
        }
    }

    /**
     * Computes left/right patrol bounds for a Goomba by sweeping the solid
     * platform surfaces adjacent to its spawn position.
     *
     * TODO: Implement the sweep:
     *   1. Find which platform the enemy is standing on (its spawn y - 1 tile).
     *   2. Walk left/right along platforms at the same height (use their x/width).
     *   3. Stop when there is a gap or a blocking solid object in the way.
     *   4. Return { left: minX, right: maxX } of the connected surface.
     */
    private computePatrolBounds(
        enemyData: EnemyData,
        _solidObjects: Phaser.GameObjects.GameObject[],
    ): PatrolBounds {
        // TODO: replace with real platform graph sweep (see doc comment above)
        const DEFAULT_RANGE = 200;
        return {
            left: enemyData.x - DEFAULT_RANGE,
            right: enemyData.x + DEFAULT_RANGE,
        };
    }
}
