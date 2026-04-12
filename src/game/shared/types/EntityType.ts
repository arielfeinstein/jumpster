/**
 * EntityType.ts
 *
 * The union of all placeable entity kinds.  Lives in shared/ so both the
 * editor and the play scene can reference it without depending on each other.
 */

/** All placeable entity kinds in the level. */
export type EntityType =
    | 'platform'
    | 'enemy'
    | 'coin'
    | 'checkpoint'
    | 'start-flag'
    | 'end-flag'
    | 'spikes';
