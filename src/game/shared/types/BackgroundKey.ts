/**
 * BackgroundKey.ts
 *
 * Frame index in the 'bg-tilesheet' spritesheet.  Lives in shared/ so both
 * the editor and the play scene can reference it.
 */

/** Frame index in the 'bg-tilesheet' spritesheet. */
export type BackgroundKey = 0 | 1 | 2 | 3 | 4 | 5;

/** The background shown when creating a new level. */
export const DEFAULT_BACKGROUND: BackgroundKey = 0;
