/**
 * ResizeWorldCommand.ts
 *
 * Records the resizing of the game world bounds.
 *
 * execute() — updates the world grid bounds, then force-deletes out-of-bounds entities.
 * undo()    — reverts the world grid bounds, then recreates the deleted entities from stored snapshots.
 */

import Command from './Command';
import GameEntity from '../../../gameObjects/GameEntity';
import { IEntityManager, IPlatformRelManager } from '../types/ManagerInterfaces';
import EntityRegistry from '../registry/EntityRegistry';
import { EntitySnapshot } from '../types/EditorTypes';
import Phaser from 'phaser';

export default class ResizeWorldCommand extends Command {
    private readonly scene: Phaser.Scene;
    private readonly entityManager: IEntityManager;
    private readonly relManager: IPlatformRelManager;

    private readonly oldWidthUnits: number;
    private readonly oldHeightUnits: number;
    private readonly newWidthUnits: number;
    private readonly newHeightUnits: number;

    private readonly deletedSnapshots: EntitySnapshot[];
    
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
        this.deletedSnapshots = outboundEntities.map(e => e.snapshot());
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
            const entity = EntityRegistry.create(
                snap.entityType,
                this.scene,
                snap.x,
                snap.y,
                snap.width,
                snap.height,
                snap.variant,
                snap.id,
            );
            this.entityManager.addEntity(entity);
            this.relManager.onEntityPlaced(entity);
        }
    }
}
