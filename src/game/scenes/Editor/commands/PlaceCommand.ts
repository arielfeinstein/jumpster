/**
 * PlaceCommand.ts
 *
 * Records the placement of one or more entities that were dropped from the
 * palette and finalised by DragController.
 *
 * execute() — makes entities fully visible and registers them in EntityManager.
 * undo()    — removes entities from EntityManager and destroys their display
 *             objects.  Uses EntityRegistry to recreate them on redo (so the
 *             display objects are fresh after destroy).
 */

import Command from './Command';
import GameEntity, { EntitySnapshot } from '../../../shared/gameObjects/GameEntity';
import { IEntityManager, IPlatformRelManager } from '../types/ManagerInterfaces';
import EntityRegistry from '../../../shared/registry/EntityRegistry';
import Phaser from 'phaser';

export default class PlaceCommand extends Command {

    /** Snapshots captured at placement time for recreating entities on redo. */
    private readonly snapshots: EntitySnapshot[];

    /** Live entity references — replaced after each undo/redo cycle. */
    private entities: GameEntity[];

    private readonly scene: Phaser.Scene;
    private readonly entityManager: IEntityManager;
    private readonly relManager: IPlatformRelManager;

    /**
     * @param scene          The editor scene (needed to recreate entities after undo).
     * @param entities       The entities that were just placed (ghost alpha, not yet in grid).
     * @param entityManager  Used to register/remove entities in the spatial grid.
     * @param relManager     Used to update platform–object relationships.
     */
    constructor(
        scene: Phaser.Scene,
        entities: GameEntity[],
        entityManager: IEntityManager,
        relManager: IPlatformRelManager,
    ) {
        super();
        this.scene = scene;
        this.entities = [...entities];
        this.snapshots = entities.map(e => e.snapshot());
        this.entityManager = entityManager;
        this.relManager = relManager;
    }

    get label(): string {
        const types = [...new Set(this.snapshots.map(s => s.entityType))].join(', ');
        return `Place ${types}`;
    }

    /**
     * First call: makes ghost entities fully opaque and registers them in the grid.
     * Subsequent calls (redo): recreates entities from snapshots (display objects
     * were destroyed on undo) and registers them.
     */
    execute(): void {
        if (this.entities.length === 0) {
            // Redo path — recreate from snapshots.
            this.entities = this.snapshots.map(snap =>
                EntityRegistry.create(
                    snap.entityType,
                    this.scene,
                    snap.x,
                    snap.y,
                    snap.width,
                    snap.height,
                    snap.variant,
                    snap.id,
                )
            );
        } else {
            // First placement — ghost was already in the scene at alpha 0.5.
            for (const entity of this.entities) {
                entity.setAlpha(1);
            }
        }

        for (const entity of this.entities) {
            this.entityManager.addEntity(entity);
            this.relManager.onEntityPlaced(entity);
        }
    }

    undo(): void {
        for (const entity of this.entities) {
            this.relManager.onEntityRemoved(entity);
            this.entityManager.removeEntity(entity);
            entity.destroy();
        }
        // Clear live refs — recreated from snapshots on next execute() (redo).
        this.entities = [];
    }
}
