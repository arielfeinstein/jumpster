/**
 * Enemy.ts — Abstract base class for all gameplay enemies.
 *
 * NOTE: This is the *gameplay* enemy character, NOT the editor GameEntity in
 * shared/gameObjects/EnemyEntity.ts. That class wraps a static Image for the editor.
 * This class extends Arcade.Sprite and runs in the Play scene.
 *
 * Design intent:
 *   - Provides shared contract (update, kill, handlePlayerContact) for all enemy types.
 *   - Each subclass (Goomba, FlyingEnemy, etc.) implements its own AI via update()
 *     and its own contact response via handlePlayerContact().
 *   - EnemyManager holds a Set<Enemy> and calls enemy.update(delta) each frame.
 *   - CollisionController detects contact, computes physics facts (isStomping), and
 *     passes them to handlePlayerContact() — the enemy decides what happens next.
 *   - `kill()` is a template method: plays death feedback via onKill(), then destroys.
 */

import Phaser from 'phaser';

export interface PatrolBounds {
    left: number;
    right: number;
}

/** What happens as a result of player-enemy contact. */
export type EnemyContactResult = 'enemy-killed' | 'player-damaged' | 'none';

/** Physics facts about the contact, computed by CollisionController. */
export interface ContactInfo {
    /** True if the player is falling onto the enemy from above. */
    isStomping: boolean;
}

export default abstract class Enemy extends Phaser.Physics.Arcade.Sprite {

    /** Visual variant — drives texture / tint selection in the subclass constructor. */
    readonly variant: string;

    constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, variant: string) {
        super(scene, x, y, textureKey);
        this.variant = variant;

        // Register with scene and enable Arcade physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    /**
     * Called every frame by EnemyManager.
     * @param delta  Time in ms since last frame (use for frame-rate independent movement).
     */
    abstract update(delta: number): void;

    /**
     * Called by CollisionController when the player touches this enemy.
     * The enemy decides the semantic outcome based on physics facts provided by the caller.
     *
     * @param _player  The player sprite (available for subclasses that need it, e.g. to
     *                 apply a knockback force or check player state).
     * @param info     Physics facts computed by CollisionController.
     * @returns        What should happen as a result of this contact.
     */
    abstract handlePlayerContact(_player: Phaser.Physics.Arcade.Sprite, info: ContactInfo): EnemyContactResult;

    /**
     * Template method — triggers death sequence.
     * Subclasses may override onKill() for type-specific behaviour (e.g. particles).
     * Do NOT override kill() itself.
     */
    kill(): void {
        this.onKill();
        // TODO: play death animation, then destroy on animation complete
        this.destroy();
    }

    /** Override in subclasses for type-specific death feedback (particles, sound, etc.). */
    protected onKill(): void {
        // Default: no-op
    }
}
