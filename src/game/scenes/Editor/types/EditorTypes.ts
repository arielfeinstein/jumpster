/**
 * EditorTypes.ts
 *
 * Shared type definitions and constants used throughout the level editor.
 * Centralises what was previously scattered across Editor.ts and EditorUI.tsx.
 */

// ---------------------------------------------------------------------------
// Entity types
// ---------------------------------------------------------------------------

/** All placeable entity kinds in the editor. */
export type EntityType =
    | 'platform'
    | 'enemy'
    | 'coin'
    | 'checkpoint'
    | 'start-flag'
    | 'end-flag'
    | 'spikes';

// ---------------------------------------------------------------------------
// Geometry / direction types
// ---------------------------------------------------------------------------

/** Eight cardinal + ordinal directions used for resize handles and delete-button placement. */
export type CardinalDir = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

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
// Snapshots (used by Commands)
// ---------------------------------------------------------------------------

/**
 * Immutable data snapshot of a single entity.
 * Stored inside commands so that undo/redo can recreate or restore entities
 * without holding live Phaser object references that may have been destroyed.
 */
export interface EntitySnapshot {
    id: string;
    entityType: EntityType;
    x: number;
    y: number;
    width: number;
    height: number;
}

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
