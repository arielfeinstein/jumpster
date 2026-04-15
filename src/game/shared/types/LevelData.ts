/**
 * LevelData.ts
 *
 * Serialisation interfaces for a saved level.
 * These plain-data shapes are what gets written to / read from JSON.
 * They deliberately contain no Phaser or class references so they remain
 * portable and easy to version.
 *
 * EntityData is a discriminated union — each entity type gets its own interface
 * with only the fields that are relevant to it.  TypeScript narrows the type
 * automatically when you check `entityType`.
 */

import { BackgroundKey } from './BackgroundKey';

// ---------------------------------------------------------------------------
// Per-entity serialisation — discriminated union
// ---------------------------------------------------------------------------

/** Fields shared by every entity type. */
export interface EntityDataBase {
    /** Stable UUID assigned when the entity is first created. */
    id: string;
    x: number;
    y: number;
}

export interface PlatformData extends EntityDataBase {
    entityType: 'platform';
    width: number;
    height: number;
    /** Visual skin variant (e.g. 'grass-1', 'grass-2'). */
    variant: string;
}

export interface EnemyData extends EntityDataBase {
    entityType: 'enemy';
    /** Behavioral discriminator — determines which Enemy subclass to spawn (e.g. 'goomba'). */
    enemyType: string;
    /** Visual skin variant (e.g. 'red', 'blue'). Optional — subclass applies a default. */
    variant?: string;
}

export interface CoinData extends EntityDataBase {
    entityType: 'coin';
}

export interface CheckpointData extends EntityDataBase {
    entityType: 'checkpoint';
}

export interface StartFlagData extends EntityDataBase {
    entityType: 'start-flag';
}

export interface EndFlagData extends EntityDataBase {
    entityType: 'end-flag';
}

export interface SpikesData extends EntityDataBase {
    entityType: 'spikes';
    /** Width in pixels — spikes resize horizontally. */
    width: number;
}

/**
 * Union of all entity data types.  Discriminated by `entityType`.
 * Use a type guard or switch to narrow to a specific member:
 *   if (data.entityType === 'enemy') { data.enemyType; // available }
 */
export type EntityData =
    | PlatformData
    | EnemyData
    | CoinData
    | CheckpointData
    | StartFlagData
    | EndFlagData
    | SpikesData;

// ---------------------------------------------------------------------------
// Level file root
// ---------------------------------------------------------------------------

/**
 * Root shape of a saved level file.
 *
 * `version` is a literal so that deserialisation can guard against stale files:
 *   if (data.version !== 1) throw new Error('Unsupported level version');
 */
export interface LevelData {
    version: 1;
    name: string;
    /** Number of viewport-width units the world spans horizontally. */
    worldWidthUnit: number;
    /** Number of viewport-height units the world spans vertically. */
    worldHeightUnit: number;
    entities: EntityData[];
    /** Background tile frame index. Absent means DEFAULT_BACKGROUND. */
    background: BackgroundKey;
}
