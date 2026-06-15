/**
 * EventBusRegistry
 *
 * Central contract for all Phaser <-> React communication via the EventBus.
 * Keys are the exact string names of the events.
 * Values are the expected payload structures.
 */
import { LevelData } from '../types/LevelData';
import { Difficulty } from '../types/Difficulty';

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
        levelId: string;
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

    // TODO: current-scene-ready is emitted directly via EventBus.emit (bypassing emitEvent) in
    // Editor.ts and Play.ts, and consumed via EventBus.on in PhaserGame.tsx. Migrate it here so
    // it gets the same compile-time payload contract as every other event. The payload is a
    // Phaser.Scene instance, so the type would be `{ scene: Phaser.Scene }` or a discriminated
    // union keyed by scene name.

    // ─── Editor Scene ───────────────────────────────────────────────────────────

    // TODO: Migrate editor events here during refactor

    // ─── Main Menu ──────────────────────────────────────────────────────────────

    /**
     * Emitted by React (MainMenu UI) when the user clicks Play on a level.
     * Carries the full levelData so MainMenu.ts can pass it directly to the Play scene.
     */
    'main-menu-play-level': { levelId: string; levelData: LevelData };

    /**
     * Emitted by React (MainMenu UI) when the user clicks Edit or creates a new/template level.
     * levelId present → edit existing draft. Absent → new level or template (Editor POSTs on save).
     * levelData present → pre-load this data into the editor (template or existing level layout).
     */
    'main-menu-edit-level': { levelId?: string; levelData?: LevelData; difficulty?: Difficulty };

    // ─── Preloader Scene ────────────────────────────────────────────────────────

    /** Emitted by Preloader during asset loading. value is 0–1. */
    'preloader-progress': { value: number };

    /** Emitted by Preloader when all assets have finished loading. */
    'preloader-complete': Record<string, never>;

    // ─── Editor Scene ───────────────────────────────────────────────────────────

    /**
     * Emitted by EditorUI on mount to request init data from the Editor scene.
     * Needed because editor-initialized fires during create() before React has mounted EditorUI.
     */
    'editor-request-init': Record<string, never>;

    /**
     * Emitted by Editor.ts in response to editor-request-init.
     * Carries the level title so EditorUI can pre-fill the save dialog.
     */
    'editor-initialized': { levelTitle: string; levelDifficulty: Difficulty };

    /**
     * Emitted by Editor.ts after serializing the level, immediately before scene.start('MainMenu').
     * The persistent useEditorSave hook catches this and fires the API call in the background.
     * levelId null → POST new record. levelId set → PATCH existing record.
     */
    'editor-level-saved': { levelId: string | null; title: string; levelData: LevelData; difficulty: Difficulty };

    /** Emitted by React (EditorUI) when the user confirms exiting without saving. */
    'editor-exit': Record<string, never>;

    /**
     * Emitted by EditorUI when any modal dialog opens or closes.
     * Phaser uses this to toggle space-key capture so React inputs can receive spaces
     * while a dialog is open, then restores normal capture when dismissed.
     */
    'editor-ui-dialog-active': { active: boolean };
}

export type EventName = keyof EventBusRegistry;
