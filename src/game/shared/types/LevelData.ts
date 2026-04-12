/**
 * LevelData.ts
 *
 * Serialisation interfaces for a saved level.
 * These plain-data shapes are what gets written to / read from JSON.
 * They deliberately contain no Phaser or class references so they remain
 * portable and easy to version.
 */

import { BackgroundKey } from './BackgroundKey';
import { EntityType } from './EntityType';

// ---------------------------------------------------------------------------
// Per-entity serialisation
// ---------------------------------------------------------------------------

/**
 * Minimal data needed to recreate a single entity via EntityRegistry.create().
 * Width and height are only meaningful for resizable entities (platforms); all
 * other entity types derive their dimensions from their class definition.
 */
export interface EntityData {
    /** Stable UUID assigned when the entity is first created. */
    id: string;
    entityType: EntityType;
    x: number;
    y: number;
    /** Only set for resizable entities (e.g. platforms). */
    width?: number;
    height?: number;
    variant?: string;
}

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
