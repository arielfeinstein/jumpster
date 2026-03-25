/**
 * PlatformRelationshipManager.ts
 *
 * Single source of truth for which entities are "on top of" a given platform.
 *
 * Owns a private Map<platformId, Set<GameEntity>> so Platform.ts carries no
 * relationship state of its own.
 *
 * Relationship semantics:
 *   An entity E is "on" platform P when E's bottom edge aligns with P's top
 *   edge AND at least one tile column of E overlaps P horizontally.
 *   Spatial queries delegate to EntityManager.getPlatformsBelow / getEntitiesAbove.
 */

import GameEntity from '../../../gameObjects/GameEntity';
import Platform from '../../../gameObjects/Platform';
import { IPlatformRelManager } from '../types/ManagerInterfaces';
import EntityManager from './EntityManager';

export default class PlatformRelationshipManager implements IPlatformRelManager {

    /** platform.id → set of entities standing on that platform. */
    private readonly objectsOnPlatform = new Map<string, Set<GameEntity>>();

    constructor(private readonly entityManager: EntityManager) { }

    // -----------------------------------------------------------------------
    // IPlatformRelManager implementation
    // -----------------------------------------------------------------------

    /**
     * Called after an entity is placed (or recreated on redo).
     *
     * - Platform placed: collect entities already above it.
     * - Other entity placed: register it with the platforms below it.
     */
    onEntityPlaced(entity: GameEntity): void {
        if (entity instanceof Platform) {
            const above = this.entityManager.getEntitiesAbove(entity);
            above.forEach(e => {
                if (!(e instanceof Platform)) this.add(entity, e);
            });
        } else {
            const below = this.entityManager.getPlatformsBelow(entity);
            below.forEach(p => this.add(p, entity));
        }
    }

    /**
     * Called before an entity is removed (deleted or undone place).
     *
     * - Non-platform removed: deregister it from any platforms below it.
     * - Platform removed: its entry in objectsOnPlatform is discarded.
     *   Stranded entities (those requiring a platform) are cascade-deleted
     *   by the delete flow before this point.
     */
    onEntityRemoved(entity: GameEntity): void {
        if (entity instanceof Platform) {
            this.objectsOnPlatform.delete(entity.id);
        } else {
            const below = this.entityManager.getPlatformsBelow(entity);
            below.forEach(p => this.remove(p, entity));
        }
    }

    /**
     * Called after an entity is moved to a new position.
     * `entity` is already at its NEW position when this is called.
     */
    onEntityMoved(entity: GameEntity, oldPos: { x: number; y: number }): void {
        const newX = entity.x;
        const newY = entity.y;

        // Look up platforms at the old position.
        entity.x = oldPos.x;
        entity.y = oldPos.y;
        const oldBelow = this.entityManager.getPlatformsBelow(entity);

        // Restore new position and look up platforms there.
        entity.x = newX;
        entity.y = newY;
        const newBelow = this.entityManager.getPlatformsBelow(entity);

        oldBelow.forEach(p => { if (!newBelow.has(p)) this.remove(p, entity); });
        newBelow.forEach(p => { if (!oldBelow.has(p)) this.add(p, entity); });

        if (entity instanceof Platform) {
            const above = this.entityManager.getEntitiesAbove(entity as Platform);
            above.forEach(e => {
                this.add(entity, e);
            });
        }
    }

    /**
     * Called after a platform is resized.
     * Clears its set and rebuilds from the spatial map.
     */
    onPlatformResized(platform: Platform): void {
        this.objectsOnPlatform.delete(platform.id);

        const above = this.entityManager.getEntitiesAbove(platform);
        above.forEach(e => {
            this.add(platform, e);
        });
    }

    // -----------------------------------------------------------------------
    // Deletion helpers
    // -----------------------------------------------------------------------

    /**
     * Returns non-selected entities sitting on platforms being deleted that
     * require platform support. These entities would be "stranded" without
     * their platform and should be cascade-deleted (after user confirmation).
     *
     * Entities that do NOT require a platform (e.g. coins) are left alone —
     * they simply float when their platform is removed.
     */
    getStrandedEntities(entitiesToDelete: GameEntity[]): GameEntity[] {
        const deleteIds = new Set(entitiesToDelete.map(e => e.id));
        const stranded: GameEntity[] = [];

        for (const entity of entitiesToDelete) {
            if (entity instanceof Platform) {
                for (const obj of this.getObjectsOnPlatform(entity)) {
                    if (!deleteIds.has(obj.id) && obj.requiresPlatformBelow) {
                        stranded.push(obj);
                        deleteIds.add(obj.id); // prevent duplicates across platforms
                    }
                }
            }
        }

        return stranded;
    }

    // -----------------------------------------------------------------------
    // Public query
    // -----------------------------------------------------------------------

    /** Returns the set of entities currently standing on `platform`. */
    getObjectsOnPlatform(platform: Platform): Set<GameEntity> {
        return this.objectsOnPlatform.get(platform.id) ?? new Set();
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private add(platform: Platform, entity: GameEntity): void {
        const set = this.getOrCreate(platform);
        set.add(entity);
    }

    private remove(platform: Platform, entity: GameEntity): void {
        const set = this.objectsOnPlatform.get(platform.id);
        if (!set) return;
        set.delete(entity);
        if (set.size === 0) {
            this.objectsOnPlatform.delete(platform.id);
        }
    }

    private getOrCreate(platform: Platform): Set<GameEntity> {
        let set = this.objectsOnPlatform.get(platform.id);
        if (!set) {
            set = new Set();
            this.objectsOnPlatform.set(platform.id, set);
        }
        return set;
    }
}
