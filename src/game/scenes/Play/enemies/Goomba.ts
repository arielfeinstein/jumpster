/**
 * Goomba.ts — Basic left-right patrol enemy.
 *
 * Behaviour:
 *   - Walks horizontally at a fixed speed within computed patrol bounds.
 *   - Turns around when it reaches a platform edge OR hits a solid obstacle
 *     (detected via body.blocked.left / body.blocked.right from Arcade physics).
 *   - Patrol bounds are computed at level-load time by EnemyManager, which
 *     sweeps the platform graph to find the full connected surface the goomba
 *     starts on.  This lets a goomba walk across adjacent platforms that sit
 *     flush with each other without needing per-frame spatial queries.
 *
 * Variant support:
 *   - Different skins share identical AI — variant is a string passed from
 *     level data (e.g. 'red', 'blue').  Apply texture differences in the
 *     constructor switch below.
 */

import Phaser from 'phaser';
import Enemy, { PatrolBounds, ContactInfo, EnemyContactResult } from './Enemy';
import { ANIMATION_KEYS } from '@/game/config/AnimationCatalog';
import { EnemyData } from '../../../shared/types/LevelData';
import { PlayPhysicsGroups } from '../../../shared/types/PlayPhysicsGroups';

const WALK_SPEED = 80; // px/s

export default class Goomba extends Enemy {

    private patrolLeft: number;
    private patrolRight: number;
    private direction: 1 | -1 = 1; // 1 = right, -1 = left

    constructor(
        scene: Phaser.Scene,
        data: EnemyData,
        groups: PlayPhysicsGroups,
    ) {
        super(scene, data.x, data.y, 'enemy', data.variant ?? 'default');

        const patrolBounds = Goomba.computePatrolBounds(data, groups);
        this.patrolLeft = patrolBounds.left;
        this.patrolRight = patrolBounds.right;

        // Apply variant-specific appearance
        // TODO: add texture variants once the spritesheet supports them
        // switch (variant) {
        //     case 'red': this.setTint(0xff6666); break;
        //     default: break;
        // }

        // Physics setup
        // TODO: tune body size/offset to match enemy spritesheet
        this.setOrigin(0, 0);
        this.setCollideWorldBounds(true);

        // Start walking right
        this.setVelocityX(WALK_SPEED * this.direction);

        // Start walk animation (loops forever due to repeat: -1)
        this.play(ANIMATION_KEYS.GOOMBA_WALK);
    }

    update(_delta: number): void {
        if (!this.body) return;
        const body = this.body as Phaser.Physics.Arcade.Body;

        // Turn around on physical obstacle (wall / platform edge with a solid in the way)
        if (body.blocked.left && this.direction === -1) {
            this.turn();
        } else if (body.blocked.right && this.direction === 1) {
            this.turn();
        }

        // Turn around at patrol bounds (platform edges without a blocking body)
        if (this.x <= this.patrolLeft && this.direction === -1) {
            this.turn();
        } else if (this.x >= this.patrolRight && this.direction === 1) {
            this.turn();
        }
    }

    handlePlayerContact(_player: Phaser.Physics.Arcade.Sprite, info: ContactInfo): EnemyContactResult {
        return info.isStomping ? 'enemy-killed' : 'player-damaged';
    }

    protected onKill(): void {
        this.play(ANIMATION_KEYS.GOOMBA_STOMP);
    }

    private turn(): void {
        this.direction = this.direction === 1 ? -1 : 1;
        this.setVelocityX(WALK_SPEED * this.direction);
    }

    /**
     * Computes left/right patrol bounds by sweeping the solid platform surfaces
     * adjacent to the spawn position.
     *
     * @param data    Enemy spawn data (position, variant, etc.).
     * @param _groups All physics groups for the level. Use `_groups.solid` for the
     *                platform surface sweep and `_groups.hazard` as impassable boundaries
     *                (e.g. the goomba should not patrol into spikes).
     *
     * TODO: Implement the sweep:
     *   1. Find which platform the enemy is standing on (its spawn y - 1 tile).
     *   2. Walk left/right along platforms at the same height (use their x/width).
     *   3. Stop when there is a gap, a hazard tile, or a blocking solid in the way.
     *   4. Return { left: minX, right: maxX } of the connected surface.
     */
    private static computePatrolBounds(
        data: EnemyData,
        _groups: PlayPhysicsGroups,
    ): PatrolBounds {
        // TODO: replace with real platform graph sweep (see doc comment above)
        const DEFAULT_RANGE = 200;
        return {
            left: data.x - DEFAULT_RANGE,
            right: data.x + DEFAULT_RANGE,
        };
    }
}
