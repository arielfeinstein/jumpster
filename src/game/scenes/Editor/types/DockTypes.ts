/**
 * DockTypes.ts
 *
 * Type definitions and static configuration for the dockable editor palette.
 *
 * The dock is made up of a list of DockSlotConfig entries. Each entry describes
 * what kind of slot to render — a dropdown for entity selection, an action button,
 * or a popover. This discriminated-union approach makes adding new slot types easy
 * without touching any rendering logic.
 */

import { EntityType } from './EditorTypes';

// ---------------------------------------------------------------------------
// Dock position
// ---------------------------------------------------------------------------

/** Which edge of the screen the dock is attached to. */
export type DockPosition = 'top' | 'bottom' | 'left' | 'right';

// ---------------------------------------------------------------------------
// Dropdown options
// ---------------------------------------------------------------------------

/**
 * Describes which frame to crop from a spritesheet when no standalone icon exists.
 * The `assetSrc` field on `DropdownOption` provides the spritesheet path.
 */
export interface SpriteFrame {
    /** Pixel x-offset of the frame's top-left corner in the spritesheet. */
    frameX: number;
    /** Pixel y-offset of the frame's top-left corner in the spritesheet. */
    frameY: number;
    /** Width (and height) of one square frame in pixels. */
    frameSize: number;
}

/**
 * A single selectable option inside an entity dropdown.
 *
 * For most entity types this represents a texture variant (e.g. a grass
 * platform vs an ice platform). For the Flags group, each option maps to a
 * different EntityType because the three flag entities are grouped under one
 * dock button for a cleaner UI.
 *
 * `assetSrc` always points to an image file. When `spriteFrame` is also
 * provided, `assetSrc` is treated as a spritesheet and the specified frame
 * is cropped out for display; otherwise it is rendered directly as an icon.
 */
export interface DropdownOption {
    /** Label shown in the dropdown list. */
    label: string;
    /** The EntityType that will be placed when this option is selected. */
    entityType: EntityType;
    /**
     * Optional variant key for future texture/skin support.
     * Sent as-is in the StartPlacementPayload so Phaser can choose the right asset.
     */
    variant?: string;
    /** Path to the icon image (standalone) or spritesheet (when spriteFrame is set). */
    assetSrc: string;
    /** When present, assetSrc is treated as a spritesheet and this frame is shown. */
    spriteFrame?: SpriteFrame;
}

// ---------------------------------------------------------------------------
// Dock slot configuration (discriminated union)
// ---------------------------------------------------------------------------

/**
 * Configuration for a single slot in the dock.
 * Add a new `kind` to this union to introduce new slot behaviour without
 * changing the DockSlot renderer.
 */
export type DockSlotConfig =
    /**
     * A button that opens a dropdown listing entity variants.
     * Clicking an option emits 'editor-start-placement'.
     */
    | {
          kind: 'entity-dropdown';
          /** Tooltip / aria-label for the dock button. */
          label: string;
          /** Icon shown on the dock button (default / representative image). */
          iconSrc: string;
          /**
           * When present, the dock button icon is cropped from `iconSrc` as a
           * spritesheet frame rather than displayed as a plain image.
           */
          iconSpriteFrame?: SpriteFrame;
          options: DropdownOption[];
      }
    /**
     * A simple click button that triggers a named action.
     * `visibleDuringPlacement` controls when the button is shown:
     *   'only'   — shown only while a placement ghost is active
     *   'always' — always shown (default)
     */
    | {
          kind: 'action-button';
          label: string;
          iconSrc?: string;
          /** Identifier used by EditorDock to dispatch the right callback. */
          action: string;
          visibleDuringPlacement?: 'only' | 'always';
      }
    /**
     * A button that opens a Radix Popover panel.
     * `content` is a string key so each popover can render different content
     * without new slot types.
     */
    | {
          kind: 'popover';
          label: string;
          iconSrc?: string;
          content: 'level-size';
      };

// ---------------------------------------------------------------------------
// EventBus payloads
// ---------------------------------------------------------------------------

/**
 * Payload for the 'editor-start-placement' event (React → Phaser).
 * Sent when the user selects an entity variant from a dropdown.
 */
export interface StartPlacementPayload {
    entityType: EntityType;
    variant?: string;
}

/**
 * Payload for the 'editor-placement-active' event (Phaser → React).
 * Lets the dock know whether a ghost is currently active so it can
 * show / hide the cancel button.
 */
export interface PlacementActivePayload {
    active: boolean;
    entityType?: EntityType;
}

// ---------------------------------------------------------------------------
// Static dock configuration
// ---------------------------------------------------------------------------

/**
 * The ordered list of slots that make up the editor dock.
 * Changing this array is the only thing needed to add, remove, or reorder
 * dock items.
 */
export const DOCK_SLOTS: DockSlotConfig[] = [
    {
        kind: 'entity-dropdown',
        label: 'Platform',
        iconSrc: '/assets/phaser/platform-tiles.png',
        iconSpriteFrame: { frameX: 0, frameY: 0, frameSize: 32 },
        options: [
            {
                label: 'Grass 1',
                entityType: 'platform',
                variant: 'grass-1',
                assetSrc: '/assets/phaser/platform-tiles.png',
                spriteFrame: { frameX: 0, frameY: 0, frameSize: 32 },
            },
            {
                label: 'Grass 2',
                entityType: 'platform',
                variant: 'grass-2',
                assetSrc: '/assets/phaser/platform-tiles.png',
                spriteFrame: { frameX: 64, frameY: 0, frameSize: 32 },
            },
            {
                label: 'Grass 3',
                entityType: 'platform',
                variant: 'grass-3',
                assetSrc: '/assets/phaser/platform-tiles.png',
                spriteFrame: { frameX: 128, frameY: 0, frameSize: 32 },
            },
        ],
    },
    {
        kind: 'entity-dropdown',
        label: 'Enemy',
        iconSrc: '/assets/react/enemy.png',
        options: [
            {
                label: 'Slime',
                entityType: 'enemy',
                assetSrc: '/assets/react/enemy.png',
            },
            {
                label: 'Spikes',
                entityType: 'spikes',
                assetSrc: '/assets/phaser/spikes.png',
                spriteFrame: { frameX: 192, frameY: 0, frameSize: 32 },
            },
        ],
    },
    {
        kind: 'entity-dropdown',
        label: 'Coin',
        iconSrc: '/assets/phaser/coin.png',
        options: [
            {
                label: 'Gold',
                entityType: 'coin',
                assetSrc: '/assets/phaser/coin.png',
            },
        ],
    },
    {
        kind: 'entity-dropdown',
        label: 'Flags',
        iconSrc: '/assets/react/checkpoint-flag.png',
        options: [
            {
                label: 'Checkpoint',
                entityType: 'checkpoint',
                assetSrc: '/assets/react/checkpoint-flag.png',
            },
            {
                label: 'Start Flag',
                entityType: 'start-flag',
                assetSrc: '/assets/phaser/start-flag.png',
            },
            {
                label: 'End Flag',
                entityType: 'end-flag',
                assetSrc: '/assets/phaser/end-flag.png',
            },
        ],
    },
    {
        kind: 'popover',
        label: 'Level Size',
        content: 'level-size',
    },
    {
        kind: 'action-button',
        label: 'Cancel Placement',
        action: 'cancel-placement',
        visibleDuringPlacement: 'only',
    },
    {
        kind: 'action-button',
        label: 'Dock Position',
        action: 'cycle-dock-position',
        visibleDuringPlacement: 'always',
    },
];
