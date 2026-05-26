/**
 * EventBusRegistry
 *
 * Central contract for all Phaser <-> React communication via the EventBus.
 * Keys are the exact string names of the events.
 * Values are the expected payload structures.
 */
import { LevelData } from '../types/LevelData';

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

    /**
     * Emitted by Play only when the player completes the level (reaches the end-flag).
     * Premature exits emit nothing — the event's existence implies completion.
     *
     * Listener must be a persistent React component (e.g. PhaserGame.tsx), NOT the
     * MainMenu Phaser scene (which is dead at emit time). Safe: the EventBus is
     * synchronous so the listener is called before scene.start('MainMenu') queues.
     *
     * The API call made by the listener is fire-and-forget — the scene transitions
     * to MainMenu immediately without waiting for the response. We deliberately do
     * not know the outcome; blocking the transition for a stat counter is not worth it.
     */
    'play-session-ended': {
        levelId: string;
        coinsCollected: number;
        totalCoins: number;
    };

    // ─── Editor Scene ───────────────────────────────────────────────────────────

    // TODO: Migrate editor events here during refactor

    // ─── Main Menu ──────────────────────────────────────────────────────────────

    /**
     * Emitted by React (MainMenu UI) when the user clicks Play on a level.
     * TODO (wiring): Add listener in MainMenu.ts → scene.start('Play', { levelId, levelData }).
     * Note: Play scene will need to accept both levelId and full level data JSON from scene data.
     */
    'main-menu-play-level': { levelId: string };

    /**
     * Emitted by React (MainMenu UI) when the user clicks Edit or creates a new/template level.
     * levelId present → edit existing draft. Absent → new level or template (Editor POSTs on save).
     * levelData present → pre-load this data into the editor (template or existing level layout).
     */
    'main-menu-edit-level': { levelId?: string; levelData?: LevelData };

    /**
     * Emitted by EditorUI on mount to request init data from the Editor scene.
     * Needed because editor-initialized fires during create() before React has mounted EditorUI.
     */
    'editor-request-init': Record<string, never>;

    /**
     * Emitted by Editor.ts in response to editor-request-init.
     * Carries the level title so EditorUI can pre-fill the save dialog.
     */
    'editor-initialized': { levelTitle: string };

    /**
     * Emitted by Editor.ts after serializing the level, immediately before scene.start('MainMenu').
     * The persistent useEditorSave hook catches this and fires the API call in the background.
     * levelId null → POST new record. levelId set → PATCH existing record.
     */
    'editor-level-saved': { levelId: string | null; title: string; levelData: LevelData };
}

export type EventName = keyof EventBusRegistry;
