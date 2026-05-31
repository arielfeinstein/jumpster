import { Scene } from 'phaser';
import { PLAYER_ANIMATIONS, ENEMY_ANIMATIONS, FLAG_ANIMATIONS, type AnimationConfig } from '../../config/AnimationCatalog';

export default class AnimationManager {

    static createAll(scene: Scene): void {
        [...PLAYER_ANIMATIONS, ...ENEMY_ANIMATIONS, ...FLAG_ANIMATIONS].forEach((animation) => {
            this.createAnimation(scene, animation);
        });
    }

    private static createAnimation(scene: Scene, animation: AnimationConfig): void {
        if (scene.anims.exists(animation.key)) {
            return;
        }

        scene.anims.create({
            key: animation.key,
            frames: scene.anims.generateFrameNumbers(animation.textureKey, {
                start: animation.startFrame,
                end: animation.endFrame,
            }),
            frameRate: animation.frameRate,
            repeat: animation.repeat,
        });
    }
}