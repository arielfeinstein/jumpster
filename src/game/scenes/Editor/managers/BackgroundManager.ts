/**
 * BackgroundManager.ts
 *
 * Owns the editor's background TileSprite — the repeating tile pattern that
 * fills the viewport behind the grid and all entities.
 *
 * The TileSprite is pinned to the camera (scrollFactor 0) so it stays fixed
 * regardless of how the user pans. Swapping backgrounds destroys the old
 * TileSprite and creates a fresh one with the new frame from 'bg-tilesheet'.
 *
 * Called by SetBackgroundCommand for undo/redo support.
 */

import Phaser from 'phaser';
import { BackgroundKey, DEFAULT_BACKGROUND } from '../../../shared/types/BackgroundKey';
import { createBackground } from '../../../shared/utils/BackgroundUtils';

export default class BackgroundManager {

    private scene: Phaser.Scene;
    private tileSprite: Phaser.GameObjects.TileSprite;
    private _currentKey: BackgroundKey;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._currentKey = DEFAULT_BACKGROUND;

        this.tileSprite = createBackground(this.scene, DEFAULT_BACKGROUND);
    }

    /** The currently active background frame index. */
    get currentKey(): BackgroundKey {
        return this._currentKey;
    }

    /**
     * Swaps the background to a different tile pattern.
     * Destroys the old TileSprite and creates a new one with the given frame.
     */
    setBackground(key: BackgroundKey): void {
        this._currentKey = key;

        this.tileSprite.destroy();
        this.tileSprite = createBackground(this.scene, key);
    }

    /** Tears down the TileSprite. Called on scene shutdown. */
    destroy(): void {
        this.tileSprite.destroy();
    }
}
