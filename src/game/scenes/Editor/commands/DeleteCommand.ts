/**
 * DeleteCommand.ts
 *
 * Records the deletion of one or more entities.
 *
 * execute() — removes entities from the grid and destroys their display objects.
 * undo()    — recreates entities from stored snapshots and re-registers them.
 */

import Command from './Command';
import GameEntity from '../../../shared/gameObjects/GameEntity';
import { EntityData } from '../../../shared/types/LevelData';
import { IEntityManager, IPlatformRelManager } from '../types/ManagerInterfaces';
import EntityRegistry from '../../../shared/registry/EntityRegistry';
import Phaser from 'phaser';

export default class DeleteCommand extends Command {

    private readonly snapshots: EntityData[];
    private readonly scene: Phaser.Scene;
    private readonly entityManager: IEntityManager;
    private readonly relManager: IPlatformRelManager;

    /**
     * @param scene    The editor scene (needed to recreate entities on undo).
     * @param entities The entities to delete.  Snapshots are captured here.
     */
    constructor(
        scene: Phaser.Scene,
        entities: GameEntity[],
        entityManager: IEntityManager,
        relManager: IPlatformRelManager,
    ) {
        super();
        this.scene = scene;
        this.snapshots = entities.map(e => e.serialize());
        this.entityManager = entityManager;
        this.relManager = relManager;
    }

    get label(): string {
        const types = [...new Set(this.snapshots.map(s => s.entityType))].join(', ');
        return `Delete ${types}`;
    }

    execute(): void {
        // Entities may have already been destroyed (e.g., first call); if so,
        // look them up and destroy them, otherwise just use the snapshots.
        for (const snap of this.snapshots) {
            const entity = this.entityManager.getById(snap.id);
            if (!entity) continue;
            this.relManager.onEntityRemoved(entity);
            this.entityManager.removeEntity(entity);
            entity.destroy();
        }
    }

    undo(): void {
        // Recreate each entity from its snapshot and re-register it.
        for (const snap of this.snapshots) {
            const entity = EntityRegistry.create(this.scene, snap);
            this.entityManager.addEntity(entity);
            this.relManager.onEntityPlaced(entity);
        }
    }
}
