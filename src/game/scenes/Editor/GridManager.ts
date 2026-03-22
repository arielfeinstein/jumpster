import Phaser from 'phaser';
import { TILE_SIZE } from '../../config';

export default class GridManager {
    /**
     * Updates raw coord to the nearest top-left corner of a grid cell.
     */
    public static updateToSnappedCoord(coord: Phaser.Math.Vector2) {
        coord.x = Math.floor(coord.x / TILE_SIZE) * TILE_SIZE;
        coord.y = Math.floor(coord.y / TILE_SIZE) * TILE_SIZE;
    }

    /**
     * Creates a consistent, canonical string key from a position vector.
     */
    public static getPositionKey(pos: Phaser.Math.Vector2): string {
        return `${pos.x},${pos.y}`;
    }
}
