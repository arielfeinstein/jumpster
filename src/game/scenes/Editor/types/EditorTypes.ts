/**
 * EditorTypes.ts
 *
 * Editor-specific type definitions and constants.
 * Scene-agnostic types (EntityType, BackgroundKey, EntitySnapshot, etc.) live
 * in src/game/shared/ and are imported from there by both this file and by
 * editor subsystems directly.
 */

import type GameEntity from '../../../shared/gameObjects/GameEntity';
import type { IEntityManager } from './ManagerInterfaces';

// ---------------------------------------------------------------------------
// Geometry / direction types
// ---------------------------------------------------------------------------

/** Eight cardinal + ordinal directions used for resize handles and delete-button placement. */
export type CardinalDir = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

/**
 * Per-entity-type configuration for the generic resize system.
 * Looked up from EntityRegistry when a resizable entity is selected.
 */
export interface ResizeConfig {
    /** Which resize handles to show (e.g. all 8 for Platform, ['w','e'] for Spikes). */
    directions: CardinalDir[];
    /**
     * Returns true when the entity's current geometry is valid during a resize drag.
     * Called on every drag frame — the entity is already at its tentative position/size.
     * `fromRect` is the geometry before the drag started (for comparison checks).
     */
    validate: (entity: GameEntity, fromRect: Rect, entityManager: IEntityManager) => boolean;
}

/** A plain rectangle used as a snapshot (no Phaser dependency). */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ---------------------------------------------------------------------------
// Drag context
// ---------------------------------------------------------------------------

/** Whether a drag is repositioning existing entities. */
export type DragMode = 'move';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Red tint applied to ghost entities when placement is invalid. */
export const RED_TINT = 0xff0000;

/**
 * Minimum pixel distance a pointer must travel before a drag is registered.
 * Prevents accidental drags from a tap/click.
 */
export const DRAG_THRESHOLD = 16;

/** Z-depth values for editor overlay objects. */
export const depthConfig = {
    /** Transparent interactive zone that sits over the selection outline to intercept pointer events. */
    SELECTION_ZONE: 50,
    DELETE_BUTTON: 100,
    SIZING_HANDLES: 150,
} as const;
