/**
 * MoveCommand.ts
 *
 * Records the movement of one or more entities (supports multi-drag natively).
 *
 * All selected entities move by the same world-space delta, so the command
 * stores per-entity from/to positions captured at drag-end time.
 *
 * execute() — moves entities to their final positions and updates the grid.
 * undo()    — restores entities to their original positions and updates the grid.
 */

import Command from './Command';
import GameEntity from '../../../shared/gameObjects/GameEntity';
import { IEntityManager, IPlatformRelManager } from '../types/ManagerInterfaces';

export interface MoveEntry {
    entity: GameEntity;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
}

export default class MoveCommand extends Command {

    private readonly entries: MoveEntry[];
    private readonly entityManager: IEntityManager;
    private readonly relManager: IPlatformRelManager;

    constructor(
        entries: MoveEntry[],
        entityManager: IEntityManager,
        relManager: IPlatformRelManager,
    ) {
        super();
        this.entries = entries;
        this.entityManager = entityManager;
        this.relManager = relManager;
    }

    get label(): string {
        const n = this.entries.length;
        return `Move ${n} ${n === 1 ? 'entity' : 'entities'}`;
    }

    execute(): void {
        for (const { entity, fromX, fromY, toX, toY } of this.entries) {
            this.entityManager.removeEntity(entity);
            this.relManager.onEntityRemoved(entity);

            entity.x = toX;
            entity.y = toY;

            this.entityManager.addEntity(entity);
            this.relManager.onEntityMoved(entity, { x: fromX, y: fromY });
        }
    }

    undo(): void {
        for (const { entity, fromX, fromY, toX, toY } of this.entries) {
            this.entityManager.removeEntity(entity);
            this.relManager.onEntityRemoved(entity);

            entity.x = fromX;
            entity.y = fromY;

            this.entityManager.addEntity(entity);
            this.relManager.onEntityMoved(entity, { x: toX, y: toY });
        }
    }
}
