import Phaser from 'phaser';
import { ANIMATION_KEYS } from '../../config/AnimationCatalog';
import { IFRAME_DURATION_MS } from '../../config/GameConstants';

// Each blink = BLINK_HALF_CYCLE_MS fade-out + same fade-in (yoyo).
const BLINK_HALF_CYCLE_MS = 100;

export default class Player extends Phaser.Physics.Arcade.Sprite {
    private isHittingGround: boolean = false;
    private blinkTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'fox');
        
        // Add this sprite to the scene and enable physics on it
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Physics properties
        this.setCollideWorldBounds(true);
        this.setGravityY(800);
        this.setOrigin(0.5, 1); // Anchor at bottom-center

        // Shrink the physics body a bit for a better fit
        this.body?.setSize(20, 26);
        this.body?.setOffset(6, 6);

        // Start idle
        this.play(ANIMATION_KEYS.FOX_IDLE);
        
        // Handle when hit ground animation completes
        this.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + ANIMATION_KEYS.FOX_HIT_GROUND, () => {
            this.isHittingGround = false;
        });
    }

    /**
     * Teleports the player to the respawn position and resets movement state.
     * Called by CheckpointManager during the respawn sequence.
     */
    respawn(x: number, y: number): void {
        this.stopBlink();
        this.setPosition(x, y);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        body.setAcceleration(0, 0);
        this.isHittingGround = false;
        this.play(ANIMATION_KEYS.FOX_IDLE, true);
    }

    /**
     * Triggers the player's hit visual feedback (flash, knockback, etc.).
     * HP reduction is handled by HealthManager — this is purely cosmetic.
     */
    startHurtFlash(): void {
        this.stopBlink();
        const repeats = Math.round(IFRAME_DURATION_MS / (BLINK_HALF_CYCLE_MS * 2)) - 1;
        this.blinkTween = this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: BLINK_HALF_CYCLE_MS,
            yoyo: true,
            repeat: repeats,
            onComplete: () => {
                this.setAlpha(1);
                this.blinkTween = null;
            },
        });
    }

    private stopBlink(): void {
        this.blinkTween?.stop();
        this.blinkTween = null;
        this.setAlpha(1);
    }

    /**
     * Applies an upward velocity burst after stomping an enemy.
     */
    bounceOffEnemy(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        // TODO: tune bounce force
        body.setVelocityY(-200);
    }

    /**
     * Triggers the player's level completion sequence.
     */
    onLevelCompleted(): void {
        // TODO: trigger win sequence — play animation, sound, etc...
    }

    update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
        if (!this.body) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isOnGround = body.blocked.down || body.touching.down;
        const isJumping = !isOnGround && body.velocity.y < 0;
        const isFalling = !isOnGround && body.velocity.y > 0;

        // Reset hit ground state if we leave the ground
        if (!isOnGround) {
            this.isHittingGround = false;
        }

        // Detect just landed
        if (isOnGround && this.anims.currentAnim?.key === ANIMATION_KEYS.FOX_FALL) {
            this.isHittingGround = true;
            this.play(ANIMATION_KEYS.FOX_HIT_GROUND, true);
        }

        // Horizontal movement
        const maxSpeed = 160;
        const acceleration = 600;
        const drag = 500;

        if (cursors.left.isDown) {
            body.setAccelerationX(-acceleration);
            this.setFlipX(true);
        } else if (cursors.right.isDown) {
            body.setAccelerationX(acceleration);
            this.setFlipX(false);
        } else {
            body.setAccelerationX(0);
            // Apply drag when not moving horizontally
            if (isOnGround) {
                body.setDragX(drag);
            } else {
                body.setDragX(drag * 0.5); // less drag in air
            }
        }

        // Cap max speed
        body.setMaxVelocity(maxSpeed, 1000);

        // Jumping
        if (isOnGround && (cursors.up.isDown || cursors.space.isDown)) {
            body.setVelocityY(-750);
            this.isHittingGround = false;
            this.play(ANIMATION_KEYS.FOX_JUMP, true);
        }

        // Animations Update
        if (!this.isHittingGround) {
            if (isJumping) {
                this.play(ANIMATION_KEYS.FOX_JUMP, true);
            } else if (isFalling) {
                this.play(ANIMATION_KEYS.FOX_FALL, true);
            } else if (isOnGround && Math.abs(body.velocity.x) > 10) {
                this.play(ANIMATION_KEYS.FOX_RUN, true);
            } else if (isOnGround && Math.abs(body.velocity.x) <= 10) {
                this.play(ANIMATION_KEYS.FOX_IDLE, true);
            }
        }
    }
}
