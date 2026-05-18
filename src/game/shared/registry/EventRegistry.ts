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

    /** Emitted when the game is paused (e.g., via ESC key). */
    'play-pause': Record<string, never>;

    /** Emitted when the game is resumed from a pause. */
    'play-resume': Record<string, never>;

    /** Emitted by React to ask Phaser to leave the Play scene and go to MainMenu. */
    'play-go-to-main-menu': Record<string, never>;

    /** Emitted by React to restart the current level from the beginning. */
    'play-restart': Record<string, never>;

    /** Emitted by React (PlayUI) on mount to ask Phaser to re-send play-ready.
     * Needed because play-ready fires before React has mounted the HUD. */
    'play-request-ready': Record<string, never>;

    /** Emitted once when the level is fully loaded and ready to play.
     * Use this to initialize the HUD state. */
    'play-ready': {
        levelName: string;
        hp: number;
        maxHp: number;
        coinsCollected: number;
        totalCoins: number;
    };

    /** Emitted when the player's health changes. */
    'play-health-changed': {
        hp: number;
    };

    /** Emitted when the player collects a coin or the total coins in the level changes. */
    'play-coins-changed': {
        coinsCollected: number;
    };

    // ─── Editor Scene ───────────────────────────────────────────────────────────
    
    // TODO: Migrate editor events here during refactor
}

export type EventName = keyof EventBusRegistry;
