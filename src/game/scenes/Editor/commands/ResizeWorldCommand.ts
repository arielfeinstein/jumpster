/**
 * ResizeWorldCommand.ts
 *
 * Records the resizing of the game world bounds.
 *
 * execute() — updates the world grid bounds, then force-deletes out-of-bounds entities.
 * undo()    — reverts the world grid bounds, then recreates the deleted entities from stored snapshots.
 */

import Command from './Command';
import GameEntity from '../../../shared/gameObjects/GameEntity';
import { EntityData } from '../../../shared/types/LevelData';
import { IEntityManager, IPlatformRelManager } from '../types/ManagerInterfaces';
import EntityRegistry from '../../../shared/registry/EntityRegistry';
import Phaser from 'phaser';

export default class ResizeWorldCommand extends Command {
    private readonly scene: Phaser.Scene;
    private readonly entityManager: IEntityManager;
    private readonly relManager: IPlatformRelManager;

    private readonly oldWidthUnits: number;
    private readonly oldHeightUnits: number;
    private readonly newWidthUnits: number;
    private readonly newHeightUnits: number;

    private readonly deletedSnapshots: EntityData[];
    
    // Provided dimension callback to keep Editor.ts synchronized
    private readonly changeDimensionsFn: (w: number, h: number) => void;

    constructor(
        scene: Phaser.Scene,
        oldWidth: number,
        oldHeight: number,
        newWidth: number,
        newHeight: number,
        outboundEntities: GameEntity[],
        entityManager: IEntityManager,
        relManager: IPlatformRelManager,
        changeDimensionsFn: (w: number, h: number) => void
    ) {
        super();
        this.scene = scene;
        this.oldWidthUnits = oldWidth;
        this.oldHeightUnits = oldHeight;
        this.newWidthUnits = newWidth;
        this.newHeightUnits = newHeight;
        this.deletedSnapshots = outboundEntities.map(e => e.serialize());
        this.entityManager = entityManager;
        this.relManager = relManager;
        this.changeDimensionsFn = changeDimensionsFn;
    }

    get label(): string {
        return `Resize World (${this.newWidthUnits}x${this.newHeightUnits})`;
    }

    execute(): void {
        // Change the dimensions
        this.changeDimensionsFn(this.newWidthUnits, this.newHeightUnits);

        // Delete out-of-bounds entities
        for (const snap of this.deletedSnapshots) {
            const entity = this.entityManager.getById(snap.id);
            if (entity) {
                this.relManager.onEntityRemoved(entity);
                this.entityManager.removeEntity(entity);
                entity.destroy();
            }
        }
    }

    undo(): void {
        // Revert dimensions
        this.changeDimensionsFn(this.oldWidthUnits, this.oldHeightUnits);

        // Recreate deleted entities
        for (const snap of this.deletedSnapshots) {
            const entity = EntityRegistry.create(this.scene, snap);
            this.entityManager.addEntity(entity);
            this.relManager.onEntityPlaced(entity);
        }
    }
}
