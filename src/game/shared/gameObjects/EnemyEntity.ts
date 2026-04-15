/**
 * EnemyEntity.ts
 *
 * Editor entity for an enemy placement marker.  Wraps a Phaser.GameObjects.Image
 * and exposes it as `displayObject` so the editor can select, move, and delete it.
 *
 * This is NOT the gameplay enemy character.  At runtime the Play scene reads this
 * entity's position/variant from LevelData and hands it to EnemyManager, which
 * spawns the actual Arcade.Sprite (Goomba, etc.) from it.
 *
 * Texture key: 'enemy' (spritesheet, frame 1 used as the static editor icon).
 */

import Phaser from 'phaser';
import GameEntity from './GameEntity';
import { EnemyData } from '../types/LevelData';
import { TILE_SIZE } from '../../config';

export default class EnemyEntity extends GameEntity {

    readonly entityType = 'enemy' as const;
    readonly requiresPlatformBelow = true;
    readonly isSingleton = false;
    readonly isResizable = false;
    readonly playBehavior = 'enemy' as const;

    readonly displayObject: Phaser.GameObjects.Image;

    /** Which Enemy subclass to spawn at runtime (e.g. 'goomba'). */
    readonly enemyType: string;

    get width(): number { return TILE_SIZE; }
    get height(): number { return TILE_SIZE; }

    /**
     * @param scene      The Phaser scene that owns this entity.
     * @param x          World-space top-left x (grid-snapped).
     * @param y          World-space top-left y (grid-snapped).
     * @param enemyType  Behavioral discriminator — which subclass to spawn (default 'goomba').
     * @param variant    Optional skin variant (passed through to the gameplay Enemy).
     * @param id         Optional stable UUID — supply when deserialising from a save file.
     */
    constructor(scene: Phaser.Scene, x: number, y: number, enemyType = 'goomba', variant?: string, id?: string) {
        super(id, variant);
        this.enemyType = enemyType;
        // Frame 1 is the standing pose used as the palette / editor icon.
        this.displayObject = scene.add.image(x, y, 'enemy', 1).setOrigin(0, 0);
    }

    createGhost(scene: Phaser.Scene): EnemyEntity {
        const ghost = new EnemyEntity(scene, this.x, this.y, this.enemyType, this.variant);
        ghost.setAlpha(0.5);
        return ghost;
    }

    serialize(): EnemyData {
        return {
            entityType: 'enemy',
            id: this.id,
            x: this.x,
            y: this.y,
            enemyType: this.enemyType,
            variant: this.variant !== 'default' ? this.variant : undefined,
        };
    }
}
