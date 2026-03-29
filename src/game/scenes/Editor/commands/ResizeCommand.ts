/**
 * ResizeCommand.ts
 *
 * Records a resize operation for any resizable entity.
 *
 * Stores the from/to rectangles so the resize can be fully reversed.
 * Relationships are updated via PlatformRelationshipManager.onEntityResized().
 *
 * execute() — applies the new rectangle and updates relationships.
 * undo()    — restores the original rectangle and relationships.
 */

import Command from './Command';
import GameEntity from '../../../gameObjects/GameEntity';
import { IEntityManager, IPlatformRelManager } from '../types/ManagerInterfaces';
import { Rect } from '../types/EditorTypes';

export default class ResizeCommand extends Command {

    private readonly entity: GameEntity;
    private readonly fromRect: Rect;
    private readonly toRect: Rect;
    private readonly entityManager: IEntityManager;
    private readonly relManager: IPlatformRelManager;

    /**
     * @param entity        The entity being resized.
     * @param fromRect      The rectangle before the resize (captured before drag starts).
     * @param toRect        The rectangle after the resize (captured at drag end).
     * @param entityManager For re-registering the entity in the spatial grid.
     * @param relManager    For recalculating relationships after resize.
     */
    constructor(
        entity: GameEntity,
        fromRect: Rect,
        toRect: Rect,
        entityManager: IEntityManager,
        relManager: IPlatformRelManager,
    ) {
        super();
        this.entity = entity;
        this.fromRect = { ...fromRect };
        this.toRect = { ...toRect };
        this.entityManager = entityManager;
        this.relManager = relManager;
    }

    get label(): string {
        return `Resize ${this.entity.entityType} (${this.fromRect.width}×${this.fromRect.height} → ${this.toRect.width}×${this.toRect.height})`;
    }

    execute(): void {
        this.applyRect(this.toRect);
    }

    undo(): void {
        this.applyRect(this.fromRect);
    }

    private applyRect(rect: Rect): void {
        // Remove from grid, apply new geometry, re-add.
        this.entityManager.removeEntity(this.entity);
        this.relManager.onEntityRemoved(this.entity);

        this.entity.x = rect.x;
        this.entity.y = rect.y;
        this.entity.resize(rect.width, rect.height);

        this.entityManager.addEntity(this.entity);
        this.relManager.onEntityResized(this.entity);
    }
}
