/**
 * PlatformRelationshipManager.ts
 *
 * Single source of truth for which entities are "on top of" a given platform.
 *
 * Owns a private Map<platformId, Set<GameEntity>> so Platform.ts carries no
 * relationship state of its own.  The draggability side-effect (a platform
 * with objects on it cannot be dragged) is managed here as well, by calling
 * Phaser's input manager directly through platform.displayObject.scene.
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
     * - Platform removed: its entry in objectsOnPlatform is discarded with it;
     *   no further action needed because removing a platform while entities
     *   stand on it is already blocked by canDeleteEntities().
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
    // Deletion guard
    // -----------------------------------------------------------------------

    /**
     * Returns false if deleting `entities` would leave objects stranded on a
     * platform that is also being deleted but has entities not in the delete set.
     */
    canDeleteEntities(entities: GameEntity[]): boolean {
        const deleteIds = new Set(entities.map(e => e.id));

        for (const entity of entities) {
            if (entity instanceof Platform) {
                for (const obj of this.getObjectsOnPlatform(entity)) {
                    if (!deleteIds.has(obj.id)) return false;
                }
            }
        }

        return true;
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
        if (set.size === 1) {
            // Disable dragging while something stands on the platform.
            platform.displayObject.scene.input.setDraggable(platform.displayObject, false);
        }
    }

    private remove(platform: Platform, entity: GameEntity): void {
        const set = this.objectsOnPlatform.get(platform.id);
        if (!set) return;
        set.delete(entity);
        if (set.size === 0) {
            this.objectsOnPlatform.delete(platform.id);
            // Re-enable dragging when the platform is empty.
            platform.displayObject.scene.input.setDraggable(platform.displayObject, true);
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
