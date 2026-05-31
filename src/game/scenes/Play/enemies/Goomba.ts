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
import { TILE_SIZE } from '@/game/config/GameConfig';
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

        // Start walk animation (loops forever due to repeat: -1)
        this.play(ANIMATION_KEYS.GOOMBA_WALK);
    }

    override onReady(): void {
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
        if (this.body.left <= this.patrolLeft && this.direction === -1) {
            this.turn();
        } else if (this.body.right >= this.patrolRight && this.direction === 1) {
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
     * Steps:
     *   1. Find the platform body directly under the enemy's feet.
     *   2. Build a surface row: all solid bodies at that same Y, sorted by X.
     *   3. Build a hazard row: all hazard bodies sitting on that surface, sorted by X.
     *   4. Sweep left and right via sweepBound(), which independently finds how far
     *      the surface extends (gaps stop it) and how far hazards allow (first spike
     *      stops it), then takes the more restrictive of the two.
     */
    private static computePatrolBounds(
        data: EnemyData,
        groups: PlayPhysicsGroups,
    ): PatrolBounds {
        // Y uses a small tolerance to absorb floating-point drift from Arcade physics
        // body registration. X uses no tolerance — adjacency is a strict structural check.
        const TOLERANCE = 2;

        const solidBodies = groups.solid.children.entries
            .map(e => (e as any).body as Phaser.Physics.Arcade.StaticBody)
            .filter(b => b?.enable);
        const hazardBodies = groups.hazard.children.entries
            .map(e => (e as any).body as Phaser.Physics.Arcade.StaticBody)
            .filter(b => b?.enable);

        // Find the topLayer body directly under the enemy's feet
        const feetY = data.y + TILE_SIZE;
        const supporting = solidBodies.find(b =>
            Math.abs(b.y - feetY) <= TOLERANCE &&
            b.x <= data.x &&
            b.x + b.width > data.x
        );

        if (!supporting) {
            console.warn('Goomba: no supporting platform found at spawn, using default range');
            return { left: data.x - 200, right: data.x + 200 };
        }

        // All solid bodies at the same surface height, sorted left to right
        const surfaceRow = solidBodies
            .filter(b => Math.abs(b.y - supporting.y) <= TOLERANCE)
            .sort((a, b) => a.x - b.x);

        // Hazard bodies whose bottom edge sits on this surface (spikes stand on platforms)
        const hazardRow = hazardBodies
            .filter(h => Math.abs((h.y + h.height) - supporting.y) <= TOLERANCE)
            .sort((a, b) => a.x - b.x);

        const startIdx = surfaceRow.indexOf(supporting);

        return {
            left:  Goomba.sweepBound(-1, data.x, startIdx, surfaceRow, hazardRow),
            right: Goomba.sweepBound(+1, data.x, startIdx, surfaceRow, hazardRow),
        };
    }

    /**
     * Sweeps the surface and hazard rows in one direction from startIdx, returning
     * the furthest X the goomba can reach before a gap or hazard blocks it.
     *
     * @param direction  +1 = sweep right, -1 = sweep left
     * @param spawnX     Enemy spawn X, used to determine which hazards are "ahead"
     * @param startIdx   Index of the supporting body in surfaceRow
     * @param surfaceRow All platform bodies at the surface height, sorted by X
     * @param hazardRow  All hazard bodies at the surface height, sorted by X
     */
    private static sweepBound(
        direction: 1 | -1,
        spawnX: number,
        startIdx: number,
        surfaceRow: Phaser.Physics.Arcade.StaticBody[],
        hazardRow: Phaser.Physics.Arcade.StaticBody[],
    ): number {
        // --- Surface pass: walk until a gap is found ---
        let idx = startIdx;
        while (true) {
            const nextIdx = idx + direction;
            if (nextIdx < 0 || nextIdx >= surfaceRow.length) break;

            // Gap check is always: left body's right edge vs right body's left edge.
            // Which body is "left" vs "right" depends on direction.
            const leftBody  = direction > 0 ? surfaceRow[idx] : surfaceRow[nextIdx];
            const rightBody = direction > 0 ? surfaceRow[nextIdx] : surfaceRow[idx];

            // + 1: platforms flush or overlapping are connected; 1px gap or more is not
            if (leftBody.x + leftBody.width + 1 < rightBody.x) break;

            idx = nextIdx;
        }

        const reachedBody = surfaceRow[idx];
        const surfaceBound = direction > 0
            ? reachedBody.x + reachedBody.width
            : reachedBody.x;

        // --- Hazard pass: find nearest hazard ahead in this direction ---
        // Infinity/-Infinity compose cleanly with Math.min/Math.max — no null checks needed
        let hazardBound = direction > 0 ? Infinity : -Infinity;
        for (const h of hazardRow) {
            const isAhead = direction > 0
                ? h.x >= spawnX
                : h.x + h.width <= spawnX;
            if (isAhead) {
                const edge = direction > 0 ? h.x : h.x + h.width;
                hazardBound = direction > 0
                    ? Math.min(hazardBound, edge)
                    : Math.max(hazardBound, edge);
            }
        }

        // Take the more restrictive of the two bounds
        return direction > 0
            ? Math.min(surfaceBound, hazardBound)
            : Math.max(surfaceBound, hazardBound);
    }
}
