/**
 * HealthManager.ts
 *
 * Owns the player's health state.  Knows nothing about React, the EventBus,
 * or the player sprite — it only tracks numbers and calls back when they change.
 *
 * Play.ts wires `onHealthChanged` to an EventBus emit so React stays in sync.
 * Play.ts also wires `onDied` to trigger CheckpointManager.respawn().
 *
 * Invincibility frames (iframes) prevent rapid multi-hits from one-shotting
 * the player (e.g. standing in spikes).
 */

export default class HealthManager {

    private hp: number;
    private readonly maxHp: number;
    private invincible: boolean = false;
    private iframeTimer: ReturnType<typeof setTimeout> | null = null;

    /** Wired by Play.ts → emits to React HUD. */
    onHealthChanged?: (hp: number, maxHp: number) => void;

    /** Wired by Play.ts → triggers CheckpointManager.respawn(). */
    onDied?: () => void;

    constructor(maxHp: number) {
        this.maxHp = maxHp;
        this.hp = maxHp;
    }

    getHp(): number { return this.hp; }
    getMaxHp(): number { return this.maxHp; }
    isAlive(): boolean { return this.hp > 0; }

    /**
     * Reduces HP by `amount`.  No-ops during invincibility frames.
     * Triggers `onDied` if HP reaches 0.
     */
    takeDamage(amount: number): void {
        if (this.invincible || !this.isAlive()) return;

        this.setHealth(this.hp - amount);

        if (!this.isAlive()) {
            this.onDied?.();
            return;
        }

        this.startIframes();
    }

    restoreHealth(amount: number): void {
        this.setHealth(Math.min(this.hp + amount, this.maxHp));
    }

    /** Sets HP to an exact value (used by CheckpointManager on respawn). */
    setHealth(amount: number): void {
        this.hp = Math.max(0, Math.min(amount, this.maxHp));
        this.onHealthChanged?.(this.hp, this.maxHp);
    }

    /** Called by CheckpointManager after respawn to clear any lingering iframes. */
    clearIframes(): void {
        this.invincible = false;
        if (this.iframeTimer !== null) {
            clearTimeout(this.iframeTimer);
            this.iframeTimer = null;
        }
    }

    private startIframes(): void {
        // TODO: tune iframe duration (ms), consider exposing as a constant
        const IFRAME_DURATION_MS = 1000;
        this.invincible = true;
        this.iframeTimer = setTimeout(() => {
            this.invincible = false;
            this.iframeTimer = null;
        }, IFRAME_DURATION_MS);
    }
}
