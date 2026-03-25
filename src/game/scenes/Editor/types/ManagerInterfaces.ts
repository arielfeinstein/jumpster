/**
 * ManagerInterfaces.ts
 *
 * Minimal interfaces for the two core managers.
 * Commands depend on these interfaces rather than the concrete classes so
 * the command layer compiles cleanly before the manager implementations exist,
 * and so the managers are easily testable in isolation.
 */

import GameEntity from '../../../gameObjects/GameEntity';
import Platform from '../../../gameObjects/Platform';

// ---------------------------------------------------------------------------
// Entity manager
// ---------------------------------------------------------------------------

export interface IEntityManager {
    addEntity(entity: GameEntity): void;
    removeEntity(entity: GameEntity): void;
    getById(id: string): GameEntity | undefined;
    canPlace(entity: GameEntity): boolean;
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
     * Called after a platform is resized.
     * Recalculates which entities now sit on top of it.
     */
    onPlatformResized(platform: Platform): void;
}
