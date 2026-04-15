import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    private isHittingGround: boolean = false;

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
        this.play('fox-idle');
        
        // Handle when hit ground animation completes
        this.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'fox-hit-ground', () => {
            this.isHittingGround = false;
        });
    }

    /**
     * Teleports the player to the respawn position and resets movement state.
     * Called by CheckpointManager during the respawn sequence.
     */
    respawn(x: number, y: number): void {
        this.setPosition(x, y);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        body.setAcceleration(0, 0);
        this.isHittingGround = false;
        this.play('fox-idle', true);
        // TODO: play respawn animation / brief invincibility flash
    }

    /**
     * Triggers the player's hit visual feedback (flash, knockback, etc.).
     * HP reduction is handled by HealthManager — this is purely cosmetic.
     */
    takeDamage(): void {
        // TODO: play hit animation, flash sprite for iframe duration
    }

    /**
     * Applies an upward velocity burst after stomping an enemy.
     */
    bounceOffEnemy(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        // TODO: tune bounce force
        body.setVelocityY(-200);
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
        if (isOnGround && this.anims.currentAnim?.key === 'fox-fall') {
            this.isHittingGround = true;
            this.play('fox-hit-ground', true);
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
        body.setMaxVelocity(maxSpeed, 600);

        // Jumping
        if (isOnGround && (cursors.up.isDown || cursors.space.isDown)) {
            body.setVelocityY(-350);
            this.isHittingGround = false;
            this.play('fox-jump', true);
        }

        // Animations Update
        if (!this.isHittingGround) {
            if (isJumping) {
                this.play('fox-jump', true);
            } else if (isFalling) {
                this.play('fox-fall', true);
            } else if (isOnGround && Math.abs(body.velocity.x) > 10) {
                this.play('fox-run', true);
            } else if (isOnGround && Math.abs(body.velocity.x) <= 10) {
                this.play('fox-idle', true);
            }
        }
    }
}
