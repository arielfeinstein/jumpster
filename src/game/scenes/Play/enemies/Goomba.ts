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

const WALK_SPEED = 80; // px/s

export default class Goomba extends Enemy {

    private patrolLeft: number;
    private patrolRight: number;
    private direction: 1 | -1 = 1; // 1 = right, -1 = left

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        variant: string,
        patrolBounds: PatrolBounds,
    ) {
        super(scene, x, y, 'enemy', variant);

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

        // TODO: play walk animation
        // TODO: flip sprite based on direction
    }

    handlePlayerContact(_player: Phaser.Physics.Arcade.Sprite, info: ContactInfo): EnemyContactResult {
        return info.isStomping ? 'enemy-killed' : 'player-damaged';
    }

    protected onKill(): void {
        // TODO: play squash animation / particle burst
    }

    private turn(): void {
        this.direction = this.direction === 1 ? -1 : 1;
        this.setVelocityX(WALK_SPEED * this.direction);
    }
}
