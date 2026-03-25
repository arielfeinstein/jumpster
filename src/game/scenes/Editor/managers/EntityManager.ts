/**
 * EntityManager.ts
 *
 * Source of truth for which entities are in the level and where they occupy
 * the spatial grid.  Replaces the old EntityManager + gameObjMap pair.
 *
 * Key improvements over the old version:
 *   - Queries entity properties directly (requiresPlatformBelow, isSingleton)
 *     rather than using if-chains on EntityType strings.
 *   - getById() enables commands to look up entities by stable UUID.
 */

import Phaser from 'phaser';
import GameEntity from '../../../gameObjects/GameEntity';
import Platform from '../../../gameObjects/Platform';
import { IEntityManager } from '../types/ManagerInterfaces';
import { TILE_SIZE } from '../../../config';
import GridManager from './GridManager';

export default class EntityManager implements IEntityManager {

    /**
     * Optional hook called after every successful addEntity().
     * Used by the editor to set up interactivity on newly registered entities
     * without creating a circular dependency between EntityManager and the scene.
     */
    onEntityAdded?: (entity: GameEntity) => void;

    /**
     * Spatial map: position key → entity occupying that tile.
     * A single entity may occupy multiple keys (platforms wider than one tile).
     */
    private readonly tileMap = new Map<string, GameEntity>();

    /**
     * Flat registry of all entities by stable ID (for command undo/redo lookups).
     */
    private readonly entityById = new Map<string, GameEntity>();

    /**
     * Singleton tracking: at most one entity of each singleton type may exist.
     * Key is the entityType string.
     */
    private readonly singletons = new Map<string, GameEntity>();

    // -----------------------------------------------------------------------
    // IEntityManager implementation
    // -----------------------------------------------------------------------

    /**
     * Registers an entity in both the spatial tile map and the ID registry.
     * For singleton entities, records it in the singletons map.
     */
    addEntity(entity: GameEntity): void {
        this.entityById.set(entity.id, entity);

        if (entity.isSingleton) {
            this.singletons.set(entity.entityType, entity);
        }

        this.occupyTiles(entity, 'add');
        this.onEntityAdded?.(entity);
    }

    /**
     * Removes an entity from the tile map and ID registry.
     * Does NOT destroy the display object — callers or commands do that.
     */
    removeEntity(entity: GameEntity): void {
        this.occupyTiles(entity, 'remove');
        this.entityById.delete(entity.id);

        if (entity.isSingleton) {
            this.singletons.delete(entity.entityType);
        }
    }

    /**
     * Looks up an entity by its stable UUID.
     * Used by DeleteCommand.execute() to confirm the entity still exists.
     */
    getById(id: string): GameEntity | undefined {
        return this.entityById.get(id);
    }

    /**
     * Returns true if `entity` can be placed at its current position.
     *
     * Checks:
     *   1. No tile overlap with other entities.
     *   2. Singleton constraint — only one entity of this type.
     *   3. requiresPlatformBelow — at least one platform tile directly below.
     *
     * Callers must remove the entity from the grid before calling this
     * method to avoid self-collision.
     */
    canPlace(entity: GameEntity): boolean {
        // 1. Overlap check.
        if (this.isOverlapping(entity)) return false;

        // 2. Singleton check.
        if (entity.isSingleton) {
            const existing = this.singletons.get(entity.entityType);
            if (existing) return false;
        }

        // 3. Platform-below check.
        if (entity.requiresPlatformBelow) {
            if (this.getPlatformsBelow(entity).size === 0) return false;
        }

        return true;
    }

    // -----------------------------------------------------------------------
    // Spatial queries (used by managers and controllers)
    // -----------------------------------------------------------------------

    /**
     * Returns all Platform entities directly below the given rectangle.
     * "Below" means: the tile row immediately beneath rect.y + rect.height.
     */
    getPlatformsBelow(rect: { x: number; y: number; width: number; height: number }): Set<Platform> {
        const result = new Set<Platform>();
        const y = rect.y + rect.height;

        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            const key = GridManager.getPositionKeyXY(x, y);
            const entity = this.tileMap.get(key);
            if (entity instanceof Platform) result.add(entity);
        }

        return result;
    }

    /**
     * Returns all entities whose tile row is directly above the given rectangle.
     * Used when placing a platform to collect entities that now sit on it.
     *
     * @param requiredOnly  When true, only returns entities with
     *                      `requiresPlatformBelow === true`.
     */
    getEntitiesAbove(
        rect: { x: number; y: number; width: number; height: number },
        requiredOnly = false,
    ): Set<GameEntity> {
        const result = new Set<GameEntity>();
        if (rect.y === 0) return result;

        const y = rect.y - TILE_SIZE;
        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            const key = GridManager.getPositionKeyXY(x, y);
            const entity = this.tileMap.get(key);
            if (entity && (!requiredOnly || entity.requiresPlatformBelow)) {
                result.add(entity);
            }
        }

        return result;
    }

    /**
     * Returns the entity occupying the tile at world position (x, y),
     * or undefined if the tile is empty.
     */
    getEntityAt(x: number, y: number): GameEntity | undefined {
        return this.tileMap.get(GridManager.getPositionKeyXY(x, y));
    }

    /**
     * Returns all entities registered in the level (for serialisation).
     */
    getAllEntities(): GameEntity[] {
        return [...this.entityById.values()];
    }

    /** Returns the singleton entity for a given type, if one exists. */
    getSingleton(entityType: string): GameEntity | undefined {
        return this.singletons.get(entityType);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Returns true if any tile in `entity`'s bounding box is already
     * occupied by another entity in the grid.
     */
    isOverlapping(entity: GameEntity): boolean {
        for (let x = entity.x; x < entity.x + entity.width; x += TILE_SIZE) {
            for (let y = entity.y; y < entity.y + entity.height; y += TILE_SIZE) {
                const key = GridManager.getPositionKeyXY(x, y);
                if (this.tileMap.has(key)) return true;
            }
        }
        return false;
    }

    private occupyTiles(entity: GameEntity, op: 'add' | 'remove'): void {
        for (let x = entity.x; x < entity.x + entity.width; x += TILE_SIZE) {
            for (let y = entity.y; y < entity.y + entity.height; y += TILE_SIZE) {
                const key = GridManager.getPositionKeyXY(x, y);
                if (op === 'add') {
                    this.tileMap.set(key, entity);
                } else {
                    this.tileMap.delete(key);
                }
            }
        }
    }
}
