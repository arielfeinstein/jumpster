/**
 * ResizeCommand.ts
 *
 * Records a platform resize operation.
 *
 * Stores the from/to rectangles so the resize can be fully reversed.
 * Platform relationships (objectsOnIt) are also snapshotted and restored via
 * PlatformRelationshipManager.
 *
 * execute() — applies the new rectangle and updates relationships.
 * undo()    — restores the original rectangle and relationships.
 */

import Command from './Command';
import Platform from '../../../gameObjects/Platform';
import { IEntityManager, IPlatformRelManager } from '../types/ManagerInterfaces';
import { Rect } from '../types/EditorTypes';

export default class ResizeCommand extends Command {

    private readonly platform: Platform;
    private readonly fromRect: Rect;
    private readonly toRect: Rect;
    private readonly entityManager: IEntityManager;
    private readonly relManager: IPlatformRelManager;

    /**
     * @param platform    The platform being resized.
     * @param fromRect    The rectangle before the resize (captured before drag starts).
     * @param toRect      The rectangle after the resize (captured at drag end).
     * @param entityManager  For re-registering the platform in the spatial grid.
     * @param relManager  For recalculating objectsOnIt after resize.
     */
    constructor(
        platform: Platform,
        fromRect: Rect,
        toRect: Rect,
        entityManager: IEntityManager,
        relManager: IPlatformRelManager,
    ) {
        super();
        this.platform = platform;
        this.fromRect = { ...fromRect };
        this.toRect = { ...toRect };
        this.entityManager = entityManager;
        this.relManager = relManager;
    }

    get label(): string {
        return `Resize platform (${this.fromRect.width}×${this.fromRect.height} → ${this.toRect.width}×${this.toRect.height})`;
    }

    execute(): void {
        this.applyRect(this.toRect);
    }

    undo(): void {
        this.applyRect(this.fromRect);
    }

    private applyRect(rect: Rect): void {
        // Remove from grid, apply new geometry, re-add.
        this.entityManager.removeEntity(this.platform);
        this.relManager.onEntityRemoved(this.platform);

        this.platform.x = rect.x;
        this.platform.y = rect.y;
        this.platform.resize(rect.width, rect.height);

        this.entityManager.addEntity(this.platform);
        this.relManager.onPlatformResized(this.platform);
    }
}
