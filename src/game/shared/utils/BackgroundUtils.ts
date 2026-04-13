/**
 * BackgroundUtils.ts
 *
 * Shared utility for creating the repeating tile background used in both
 * the level editor and the gameplay scene.
 */

import Phaser from 'phaser';
import { BackgroundKey } from '../types/BackgroundKey';

/**
 * Creates a screen-pinned TileSprite that fills the viewport with the
 * requested background pattern.
 *
 * @param scene The Phaser scene (Editor or Play) to add the background to.
 * @param key   The frame index from 'bg-tilesheet'.
 */
export function createBackground(scene: Phaser.Scene, key: BackgroundKey): Phaser.GameObjects.TileSprite {
    const vw = scene.scale.width;
    const vh = scene.scale.height;

    return scene.add
        .tileSprite(0, 0, vw, vh, 'bg-tilesheet', key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-10);
}
