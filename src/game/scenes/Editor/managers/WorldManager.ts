/**
 * WorldManager.ts
 *
 * Manages the logic for resizing the game world, including checking for out-of-bound
 * entities and invoking the confirmation dialog when shrinking the world.
 */
import { EventBus } from '../../../EventBus';
import GameEntity from '../../../shared/gameObjects/GameEntity';
import { MAX_WORLD_WIDTH, MAX_WORLD_HEIGHT, DESIGN_WIDTH, DESIGN_HEIGHT } from '../../../config';
import { IEntityManager, IPlatformRelManager } from '../types/ManagerInterfaces';
import ResizeWorldCommand from '../commands/ResizeWorldCommand';
import CommandHistory from '../commands/CommandHistory';
import Phaser from 'phaser';

export default class WorldManager {
    private readonly scene: Phaser.Scene;
    private readonly entityManager: IEntityManager;
    private readonly relManager: IPlatformRelManager;
    private readonly history: CommandHistory;
    
    // Callback to visually apply changes in the Editor scene.
    private readonly applyDimensionsState: (wUnits: number, hUnits: number) => void;

    // We also need access to the current dimensions from the Editor to know the "old" state
    private readonly getCurrentDimensionsUnits: () => { w: number; h: number };

    constructor(
        scene: Phaser.Scene,
        entityManager: IEntityManager,
        relManager: IPlatformRelManager,
        history: CommandHistory,
        applyDimensionsState: (wUnits: number, hUnits: number) => void,
        getCurrentDimensionsUnits: () => { w: number; h: number }
    ) {
        this.scene = scene;
        this.entityManager = entityManager;
        this.relManager = relManager;
        this.history = history;
        this.applyDimensionsState = applyDimensionsState;
        this.getCurrentDimensionsUnits = getCurrentDimensionsUnits;
    }

    public async handleChangeDimensions(payload: { worldWidthUnit: number; worldHeightUnit: number }): Promise<void> {
        let { worldWidthUnit, worldHeightUnit } = payload;

        if (worldWidthUnit <= 0 || worldHeightUnit <= 0) return;

        // Calculate maximum units based on MAX_WORLD_WIDTH / DESIGN_WIDTH
        const maxUnitsW = MAX_WORLD_WIDTH / DESIGN_WIDTH;
        const maxUnitsH = MAX_WORLD_HEIGHT / DESIGN_HEIGHT;

        if (worldWidthUnit > maxUnitsW) {
            // TODO: handle rejection or specific clamp message
            worldWidthUnit = maxUnitsW;
        }

        if (worldHeightUnit > maxUnitsH) {
            // TODO: handle rejection or specific clamp message
            worldHeightUnit = maxUnitsH;
        }

        const current = this.getCurrentDimensionsUnits();
        
        // If unchanged, do nothing
        if (current.w === worldWidthUnit && current.h === worldHeightUnit) {
            return;
        }

        const newPixelWidth = DESIGN_WIDTH * worldWidthUnit;
        const newPixelHeight = DESIGN_HEIGHT * worldHeightUnit;

        // Find out-of-bounds entities
        const outbound = this.entityManager.getAllEntities().filter(e => {
            return e.x + e.width > newPixelWidth || e.y + e.height > newPixelHeight;
        });

        // Add stranded entities for the outbound entities to keep them bound together
        const outboundWithStranded = new Set(outbound);
        if (outbound.length > 0) {
            const stranded = this.relManager.getStrandedEntities(outbound);
            for (const s of stranded) {
                outboundWithStranded.add(s);
            }
        }

        const entitiesToDelete = Array.from(outboundWithStranded);

        if (entitiesToDelete.length > 0) {
            const confirmed = await new Promise<boolean>((resolve) => {
                EventBus.emit('editor-confirm-dialog', {
                    message: `Resizing to a smaller level will delete ${entitiesToDelete.length} entities that are out of bounds. Are you sure you want to continue?`,
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false),
                });
            });

            if (!confirmed) return;
        }

        const cmd = new ResizeWorldCommand(
            this.scene,
            current.w,
            current.h,
            worldWidthUnit,
            worldHeightUnit,
            entitiesToDelete,
            this.entityManager,
            this.relManager,
            this.applyDimensionsState
        );
        
        this.history.executeCommand(cmd);
    }
}
