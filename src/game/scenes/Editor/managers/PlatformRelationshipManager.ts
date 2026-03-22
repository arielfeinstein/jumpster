/**
 * PlatformRelationshipManager.ts
 *
 * Single source of truth for which entities are "on top of" a given platform.
 *
 * Previously this logic was scattered across PlacementController,
 * ObjectDragController, and Editor.ts.  Centralising it here means Commands
 * can call a single method after execute() or undo() and trust the
 * relationships are correct.
 *
 * The manager uses EntityManager for spatial lookups; it does NOT maintain a
 * separate tile map.
 *
 * Relationship semantics:
 *   An entity E is "on" platform P when E's bottom edge aligns with P's top
 *   edge AND at least one tile column of E overlaps P horizontally.
 *   This is exactly what EntityManager.getPlatformsBelow() detects.
 *
 * Platform draggability:
 *   A platform is only draggable when nothing is standing on it.
 *   The manager updates Phaser's input draggable flag whenever objectsOnIt
 *   changes, delegating to Platform's (deprecated) transition shim until
 *   Phase 6 removes it.
 */

import GameEntity from '../../../gameObjects/GameEntity';
import Platform from '../../../gameObjects/Platform';
import { IPlatformRelManager } from '../types/ManagerInterfaces';
import EntityManager from './EntityManager';

export default class PlatformRelationshipManager implements IPlatformRelManager {

    constructor(private readonly entityManager: EntityManager) {}

    // -----------------------------------------------------------------------
    // IPlatformRelManager implementation
    // -----------------------------------------------------------------------

    /**
     * Called after an entity is placed (or recreated on redo).
     *
     * - If the entity is NOT a platform: register it with any platforms below it.
     * - If the entity IS a platform: collect any entities now sitting on top.
     */
    onEntityPlaced(entity: GameEntity): void {
        if (entity instanceof Platform) {
            // Collect entities that were floating above this tile range and now
            // have a platform supporting them.
            const above = this.entityManager.getEntitiesAbove(entity);
            above.forEach(e => {
                if (!(e instanceof Platform)) {
                    entity.addObjectOnIt(e);
                }
            });
        } else {
            // Register this entity with every platform directly below it.
            const below = this.entityManager.getPlatformsBelow(entity);
            below.forEach(p => p.addObjectOnIt(entity));
        }
    }

    /**
     * Called before an entity is removed (deleted or undone place).
     *
     * - If the entity is NOT a platform: remove it from any platforms it was on.
     * - If the entity IS a platform: it carries no objectsOnIt that need cleanup
     *   here — the platform's own set is discarded with the entity.
     */
    onEntityRemoved(entity: GameEntity): void {
        if (!(entity instanceof Platform)) {
            const below = this.entityManager.getPlatformsBelow(entity);
            below.forEach(p => p.removeObjectOnIt(entity));
        }
    }

    /**
     * Called after an entity is moved to a new position.
     * Updates both the platform it came from and the platform it moved to.
     *
     * @param entity  Already at its NEW position when this is called.
     * @param oldPos  The position the entity was at before the move.
     */
    onEntityMoved(entity: GameEntity, oldPos: { x: number; y: number }): void {
        // Temporarily position at old coords to look up what was below.
        const newX = entity.x;
        const newY = entity.y;

        entity.x = oldPos.x;
        entity.y = oldPos.y;
        const oldBelow = this.entityManager.getPlatformsBelow(entity);

        entity.x = newX;
        entity.y = newY;
        const newBelow = this.entityManager.getPlatformsBelow(entity);

        // Remove from platforms that no longer support this entity.
        oldBelow.forEach(p => {
            if (!newBelow.has(p)) p.removeObjectOnIt(entity);
        });

        // Add to platforms that now support this entity.
        newBelow.forEach(p => {
            if (!oldBelow.has(p)) p.addObjectOnIt(entity);
        });
    }

    /**
     * Called after a platform is resized.
     * Rebuilds objectsOnIt from scratch by re-querying the spatial map.
     */
    onPlatformResized(platform: Platform): void {
        // Clear the current set.
        platform.setObjectsOnIt(new Set());

        // Re-collect entities above the new rectangle.
        const above = this.entityManager.getEntitiesAbove(platform);
        above.forEach(e => {
            if (!(e instanceof Platform)) {
                platform.addObjectOnIt(e);
            }
        });
    }

    // -----------------------------------------------------------------------
    // Deletion guard
    // -----------------------------------------------------------------------

    /**
     * Returns false if deleting `entities` would leave orphaned entities with
     * no supporting platform.
     *
     * A platform P blocks deletion if it has objects on top AND none of those
     * objects are also being deleted.
     */
    canDeleteEntities(entities: GameEntity[]): boolean {
        const deleteSet = new Set(entities.map(e => e.id));

        for (const entity of entities) {
            if (entity instanceof Platform) {
                for (const obj of entity.getObjectsOnIt()) {
                    const gameEntity = obj as GameEntity;
                    if (!deleteSet.has(gameEntity.id)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }
}
