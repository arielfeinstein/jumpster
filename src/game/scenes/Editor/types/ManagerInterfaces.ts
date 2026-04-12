/**
 * ManagerInterfaces.ts
 *
 * Minimal interfaces for the two core managers.
 * Commands depend on these interfaces rather than the concrete classes so
 * the command layer compiles cleanly before the manager implementations exist,
 * and so the managers are easily testable in isolation.
 */

import GameEntity from '../../../shared/gameObjects/GameEntity';

// ---------------------------------------------------------------------------
// Entity manager
// ---------------------------------------------------------------------------

export interface IEntityManager {
    addEntity(entity: GameEntity): void;
    removeEntity(entity: GameEntity): void;
    getById(id: string): GameEntity | undefined;
    canPlace(entity: GameEntity): boolean;
    getEntitiesAbove(
        rect: { x: number; y: number; width: number; height: number },
        requiredOnly?: boolean,
    ): Set<GameEntity>;
    getAllEntities(): GameEntity[];
}

// ---------------------------------------------------------------------------
// Platform relationship manager
// ---------------------------------------------------------------------------

export interface IPlatformRelManager {
    /** Called after an entity is placed (or recreated on redo). */
    onEntityPlaced(entity: GameEntity): void;

    /** Called before an entity is removed (delete or undo of place). */
    onEntityRemoved(entity: GameEntity): void;

    /**
     * Called after an entity is moved.
     * `oldPos` is the position the entity was at before the move.
     */
    onEntityMoved(entity: GameEntity, oldPos: { x: number; y: number }): void;

    /**
     * Called after any entity is resized.
     * For platforms: recalculates which entities sit on top.
     * For non-platforms: re-registers with the platforms below.
     */
    onEntityResized(entity: GameEntity): void;

    /**
     * Given a list of entities about to be deleted or removed, returns the list of
     * entities that would be stranded (requiresPlatformBelow) without them.
     */
    getStrandedEntities(entitiesToRemove: GameEntity[]): GameEntity[];
}
