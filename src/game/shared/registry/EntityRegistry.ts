/**
 * EntityRegistry.ts
 *
 * Pure factory — maps a fully-typed EntityData union member to the correct
 * GameEntity subclass.  This is the ONLY place where the entityType → constructor
 * mapping lives.
 *
 * TypeScript narrows the EntityData union in each switch case, so only the fields
 * that exist for that type are accessible (accessing `data.width` in the 'coin'
 * case is a compile error).
 *
 * Adding a new entity type:
 *   1. Add a new interface to LevelData.ts and add it to the EntityData union.
 *   2. Create a new GameEntity subclass in src/game/shared/gameObjects/.
 *   3. Add a case to create() below.
 *   No other file needs to change.
 */

import Phaser from 'phaser';
import { EntityType } from '../types/EntityType';
import { EntityData } from '../types/LevelData';
import { ResizeConfig } from '../../scenes/Editor/types/EditorTypes';
import GameEntity from '../gameObjects/GameEntity';
import Platform, { PlatformVariant } from '../gameObjects/Platform';
import EnemyEntity from '../gameObjects/EnemyEntity';
import Coin from '../gameObjects/Coin';
import Checkpoint from '../gameObjects/Checkpoint';
import Flag from '../gameObjects/Flag';
import Spikes from '../gameObjects/Spikes';

export default class EntityRegistry {

    // -----------------------------------------------------------------------
    // Factory
    // -----------------------------------------------------------------------

    /**
     * Creates the correct GameEntity subclass from a fully-typed EntityData.
     * TypeScript narrows the union in each case, giving compile-time
     * safety — accessing `data.width` in the 'platform' case is fine;
     * doing so in the 'coin' case is a type error.
     */
    static create(scene: Phaser.Scene, data: EntityData): GameEntity {
        switch (data.entityType) {
            case 'platform':
                return new Platform(
                    scene, data.x, data.y,
                    data.width, data.height,
                    data.variant as PlatformVariant,
                    data.id,
                );

            case 'enemy':
                return new EnemyEntity(scene, data.x, data.y, data.enemyType, data.variant, data.id);

            case 'coin':
                return new Coin(scene, data.x, data.y, data.id);

            case 'checkpoint':
                return new Checkpoint(scene, data.x, data.y, data.id);

            case 'start-flag':
                return new Flag(scene, data.x, data.y, 'start-flag', data.id);

            case 'end-flag':
                return new Flag(scene, data.x, data.y, 'end-flag', data.id);

            case 'spikes':
                return new Spikes(scene, data.x, data.y, data.width, data.id);
        }
    }

    // -----------------------------------------------------------------------
    // Resize configuration — static per-entity-type config for the resize system.
    // Only resizable entity types have an entry; absence means "not resizable".
    // -----------------------------------------------------------------------

    private static readonly resizeConfigs: Partial<Record<EntityType, ResizeConfig>> = {
        'platform': {
            directions: ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'],
            validate: (entity, fromRect, entityManager) => {
                if (!entityManager.canPlace(entity)) return false;
                // Shrinking a platform must not strand entities that require support.
                const aboveCount = entityManager.getEntitiesAbove(entity, true).size;
                const prevAboveCount = entityManager.getEntitiesAbove(fromRect, true).size;
                return aboveCount >= prevAboveCount;
            },
        },
        'spikes': {
            directions: ['w', 'e'],
            validate: (entity, _fromRect, entityManager) => {
                return entityManager.canPlace(entity);
            },
        },
    };

    /**
     * Returns the resize configuration for the given entity type, or
     * undefined if that type is not resizable.
     */
    static getResizeConfig(type: EntityType): ResizeConfig | undefined {
        return EntityRegistry.resizeConfigs[type];
    }

}
