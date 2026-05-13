/**
 * EventBusRegistry
 * 
 * Central contract for all Phaser <-> React communication via the EventBus.
 * Keys are the exact string names of the events.
 * Values are the expected payload structures.
 */
export interface EventBusRegistry {
    // ─── Play Scene ─────────────────────────────────────────────────────────────
    
    /** Emitted when the player reaches the end-flag. */
    'play-level-complete': {
        collected: number;
        total: number;
    };

    // TODO: Add other Play scene events here (e.g., health, coins)

    // ─── Editor Scene ───────────────────────────────────────────────────────────
    
    // TODO: Migrate editor events here during refactor
}

export type EventName = keyof EventBusRegistry;
