/**
 * EntityRegistry.ts
 *
 * Thin factory that maps an EntityType string to the constructor for that
 * entity type.  This is the ONLY place where the mapping lives — adding a new
 * entity type requires:
 *   1. A new GameEntity subclass in src/game/gameObjects/
 *   2. One new entry below
 *   No other file needs to change.
 *
 * Game objects own their own properties (width, height, requiresPlatformBelow,
 * etc.).  The registry does NOT duplicate that metadata.
 */

import Phaser from 'phaser';
import { EntityType } from '../types/EditorTypes';
import GameEntity from '../../../gameObjects/GameEntity';
import Platform from '../../../gameObjects/Platform';
import Enemy from '../../../gameObjects/Enemy';
import Coin from '../../../gameObjects/Coin';
import Checkpoint from '../../../gameObjects/Checkpoint';
import Flag, { FlagKind } from '../../../gameObjects/Flag';
import { TILE_SIZE } from '../../../config';
import Spikes from '@/game/gameObjects/Spikes';

/** Signature shared by all factory functions. */
type FactoryFn = (
    scene: Phaser.Scene,
    x: number,
    y: number,
    width?: number,
    height?: number,
    id?: string,
) => GameEntity;

export default class EntityRegistry {

    /**
     * Factory map — one entry per EntityType.
     * TypeScript enforces that every key of the union is present at compile time.
     */
    private static readonly factories: Record<EntityType, FactoryFn> = {
        'platform':   (scene, x, y, w = TILE_SIZE, h = TILE_SIZE, id) =>
                          new Platform(scene, x, y, w, h, id),

        'enemy':      (scene, x, y, _w, _h, id) => new Enemy(scene, x, y, id),

        'coin':       (scene, x, y, _w, _h, id) => new Coin(scene, x, y, id),

        'checkpoint': (scene, x, y, _w, _h, id) => new Checkpoint(scene, x, y, id),

        'start-flag': (scene, x, y, _w, _h, id) =>
                          new Flag(scene, x, y, 'start-flag', id),

        'end-flag':   (scene, x, y, _w, _h, id) =>
                          new Flag(scene, x, y, 'end-flag', id),
        'spikes':   (scene, x, y, _w, _h, id) =>
                          new Spikes(scene, x, y, id),
    };

    /**
     * Creates a new entity of the given type and adds it to `scene`.
     *
     * @param type    The entity kind to create.
     * @param scene   The Phaser scene that will own the entity.
     * @param x       World-space top-left x (should be grid-snapped by the caller).
     * @param y       World-space top-left y (should be grid-snapped by the caller).
     * @param width   Optional override — only meaningful for resizable entities.
     * @param height  Optional override — only meaningful for resizable entities.
     * @param id      Optional stable UUID — supply when deserialising from a save file.
     */
    static create(
        type: EntityType,
        scene: Phaser.Scene,
        x: number,
        y: number,
        width?: number,
        height?: number,
        id?: string,
    ): GameEntity {
        return EntityRegistry.factories[type](scene, x, y, width, height, id);
    }
}
