/**
 * LevelSerializer.ts
 *
 * Converts the current editor state to a plain JSON-serialisable object and
 * back again.
 *
 * serialize()    — iterates EntityManager, calls entity.serialize() on each,
 *                  and packages the results with world-dimension metadata.
 *
 * deserialize()  — validates the version field, then recreates each entity via
 *                  EntityRegistry (preserving stable IDs) and registers them
 *                  with EntityManager and PlatformRelationshipManager.
 *
 * Usage example (from a future "Save" / "Load" button handler):
 *
 *   const json = JSON.stringify(LevelSerializer.serialize(entityManager, worldW, worldH, 'My Level'));
 *   // … store to disk / server …
 *
 *   const data = JSON.parse(json) as LevelData;
 *   LevelSerializer.deserialize(data, scene, entityManager, relManager);
 */

import Phaser from 'phaser';
import { LevelData } from '../types/LevelData';
import { BackgroundKey } from '../types/BackgroundKey';
import EntityManager from '../../scenes/Editor/managers/EntityManager';
import PlatformRelationshipManager from '../../scenes/Editor/managers/PlatformRelationshipManager';
import BackgroundManager from '../../scenes/Editor/managers/BackgroundManager';
import EntityRegistry from '../registry/EntityRegistry';
import { PlayPhysicsGroups } from '../types/PlayPhysicsGroups';

export default class LevelSerializer {

    /**
     * Captures the full level state as a plain-data object ready for JSON.stringify().
     *
     * @param entityManager   The active entity manager.
     * @param worldWidthUnit  Number of viewport-width units the world spans.
     * @param worldHeightUnit Number of viewport-height units the world spans.
     * @param name            Human-readable level name.
     * @param background      Active background frame index.
     */
    // TODO: consider if we actually need id of entities to be stable across serialisation. If not, we could simplify by letting EntityRegistry.create() generate new IDs.
    static serialize(
        entityManager: EntityManager,
        worldWidthUnit: number,
        worldHeightUnit: number,
        name = 'Untitled',
        background: BackgroundKey,
    ): LevelData {
        return {
            version: 1,
            name,
            worldWidthUnit,
            worldHeightUnit,
            entities: entityManager.getAllEntities().map(e => e.serialize()),
            background,
        };
    }

    /**
     * Recreates a level from a saved LevelData object.
     * Existing entities in EntityManager are NOT cleared automatically — call
     * entityManager.clear() (or start a new scene) before deserialising.
     *
     * @param data         The parsed level data.
     * @param scene        The Phaser scene used to construct display objects.
     * @param entityManager  Where recreated entities are registered.
     * @param relManager   Updated after each entity is added.
     *
     * @throws Error if `data.version` is not 1.
     */
    // TODO: consider if we actually need id of entities to be stable across serialisation. If not, we could simplify by letting EntityRegistry.create() generate new IDs.
    static deserialize(
        data: LevelData,
        scene: Phaser.Scene,
        entityManager: EntityManager,
        relManager: PlatformRelationshipManager,
        backgroundManager: BackgroundManager,
    ): void {
        if (data.version !== 1) {
            throw new Error(`Unsupported level version: ${(data as { version: unknown }).version}`);
        }

        for (const entityData of data.entities) {
            const entity = EntityRegistry.create(
                entityData.entityType,
                scene,
                entityData.x,
                entityData.y,
                entityData.width,
                entityData.height,
                entityData.variant,
                entityData.id,
            );

            entityManager.addEntity(entity);
            relManager.onEntityPlaced(entity);
        }
        backgroundManager.setBackground(data.background);
    }

    /**
     * Deserializes a level for gameplay, instantiating entities and populating
     * physics groups based on their playBehavior.
     *
     * @param data      The parsed level data.
     * @param scene     The Phaser scene used to construct display objects and physics bodies.
     * @param groups    The physics groups to populate (solid, hazard, etc.).
     *
     * @returns An object containing { spawnX, spawnY } where the player should spawn.
     *          Defaults to (100, 300) if no 'spawn' checkpoint is found.
     *
     * @throws Error if `data.version` is not 1.
     */
    static deserializeForPlay(
        data: LevelData,
        scene: Phaser.Scene,
        groups: PlayPhysicsGroups,
    ): { spawnX: number; spawnY: number } {
        if (data.version !== 1) {
            throw new Error(`Unsupported level version: ${(data as { version: unknown }).version}`);
        }

        // Default spawn point if no 'spawn' checkpoint is found in the entities.
        // Editor should enforce that exactly one spawn point exists, but we fall back to a safe default just in case.
        let spawnX = 100;
        let spawnY = 300;

        for (const entityData of data.entities) {
            const entity = EntityRegistry.create(
                entityData.entityType,
                scene,
                entityData.x,
                entityData.y,
                entityData.width,
                entityData.height,
                entityData.variant,
                entityData.id,
            );

            const collidables = entity.getCollidables();

            // Route entity to appropriate physics group based on playBehavior
            switch (entity.playBehavior) {
                case 'spawn':
                    spawnX = entityData.x;
                    spawnY = entityData.y;
                    break;
                case 'solid':
                    groups.solid.addMultiple(collidables);
                    break;
                case 'hazard':
                    groups.hazard.addMultiple(collidables);
                    break;
                case 'stompable':
                    groups.stompable.addMultiple(collidables);
                    break;
                case 'collectible':
                    groups.collectible.addMultiple(collidables);
                    break;
                case 'checkpoint':
                    groups.checkpoint.addMultiple(collidables);
                    break;
                case 'goal':
                    groups.goal.addMultiple(collidables);
                    break;
            }
        }

        return { spawnX, spawnY };
    }
}
