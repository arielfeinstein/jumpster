/**
 * CameraController.ts
 *
 * Handles arrow-key camera scrolling.  Extracted from Editor.update() so that
 * the scene's update loop stays trivial.
 *
 * Call `update()` once per frame from Editor.update().
 */

import Phaser from 'phaser';
import { TILE_SIZE } from '../../../config';

export default class CameraController {

    private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private readonly camera: Phaser.Cameras.Scene2D.Camera;

    constructor(scene: Phaser.Scene) {
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.camera = scene.cameras.main;
    }

    /** Call once per frame. */
    update(): void {
        const { left, right, up, down } = this.cursors;

        if (left.isDown)  this.camera.scrollX -= TILE_SIZE;
        if (right.isDown) this.camera.scrollX += TILE_SIZE;
        if (up.isDown)    this.camera.scrollY -= TILE_SIZE;
        if (down.isDown)  this.camera.scrollY += TILE_SIZE;
    }
}
