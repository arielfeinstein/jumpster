/**
 * PlayBehavior.ts
 *
 * Declares how each entity participates in gameplay physics.
 * The entity declares *what it is*; the play scene decides *what to do with it*.
 *
 * The play scene groups entities by PlayBehavior and sets up physics per group,
 * so adding a new entity type only requires implementing the correct PlayBehavior
 * — no play scene changes needed unless an entirely new behavior category is introduced.
 *
 * Mapping:
 *   'solid'       — Platform:    collider — player stands on / bumps into it
 *   'hazard'      — Spikes:      overlap  — any contact → damage
 *   'enemy'       — Enemy:       overlap  — top → kill enemy; else → damage player
 *   'collectible' — Coin:        overlap  — collect and destroy
 *   'checkpoint'  — Checkpoint:  overlap  — update player respawn point
 *   'goal'        — End flag:    overlap  — win condition
 *   'spawn'       — Start flag:  no runtime physics — marks player spawn position
 */
export type PlayBehavior =
    | 'solid'
    | 'hazard'
    | 'enemy'
    | 'collectible'
    | 'checkpoint'
    | 'goal'
    | 'spawn';
