/**
 * GridManager.ts
 *
 * Static helpers for grid snapping and position-key generation.
 * The key is used by EntityManager's spatial map to look up which entity
 * occupies a given tile cell.
 */

import Phaser from 'phaser';
import { TILE_SIZE } from '../../config';

export default class GridManager {

    /**
     * Snaps a raw world-space coordinate to the nearest top-left corner of a
     * grid cell (multiples of TILE_SIZE).  Mutates `coord` in-place.
     */
    static updateToSnappedCoord(coord: Phaser.Math.Vector2): void {
        coord.x = Math.floor(coord.x / TILE_SIZE) * TILE_SIZE;
        coord.y = Math.floor(coord.y / TILE_SIZE) * TILE_SIZE;
    }

    /**
     * Snaps raw x, y values and returns a new vector.  Does not mutate inputs.
     */
    static snapXY(x: number, y: number): Phaser.Math.Vector2 {
        return new Phaser.Math.Vector2(
            Math.floor(x / TILE_SIZE) * TILE_SIZE,
            Math.floor(y / TILE_SIZE) * TILE_SIZE,
        );
    }

    /**
     * Returns a canonical string key for a tile position.
     * Used as the key in the EntityManager spatial map.
     */
    static getPositionKey(pos: Phaser.Math.Vector2): string {
        return `${pos.x},${pos.y}`;
    }

    /** Overload accepting raw numbers for convenience. */
    static getPositionKeyXY(x: number, y: number): string {
        return `${x},${y}`;
    }
}
