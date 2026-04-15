/**
 * CheckpointManager.ts
 *
 * Owns the "last safe state" snapshot and coordinates the full respawn sequence.
 * It is the single place that knows what to restore after the player dies.
 *
 * Snapshot captures:
 *   - Respawn position (from the spawn flag initially, then from each checkpoint hit)
 *   - HP at checkpoint time
 *   - Set of coin IDs collected up to that point
 *   (Extensible: add items, unlocked abilities, etc.)
 *
 * Respawn sequence (triggered by HealthManager.onDied):
 *   1. HealthManager.setHealth(snapshot.health)
 *   2. CoinManager.restoreToSnapshot(snapshot.collectedCoinIds)
 *   3. Player.respawn(snapshot.spawnX, snapshot.spawnY)
 *   4. HealthManager.clearIframes()
 *
 * Player is bound via setPlayer() after construction because Player is created
 * after managers during buildWorld().
 */

import Player from '../Player';
import HealthManager from './HealthManager';
import CoinManager from './CoinManager';

interface CheckpointSnapshot {
    spawnX: number;
    spawnY: number;
    health: number;
    collectedCoinIds: Set<string>;
}

export default class CheckpointManager {

    private snapshot: CheckpointSnapshot;
    private player: Player | null = null;

    private readonly healthManager: HealthManager;
    private readonly coinManager: CoinManager;

    constructor(
        spawnX: number,
        spawnY: number,
        healthManager: HealthManager,
        coinManager: CoinManager,
    ) {
        this.healthManager = healthManager;
        this.coinManager = coinManager;

        // Initial snapshot = the level's spawn point with full health and no coins collected
        this.snapshot = {
            spawnX,
            spawnY,
            health: healthManager.getHp(),
            collectedCoinIds: new Set(),
        };
    }

    /** Called after Player is created in Play.buildWorld(). */
    setPlayer(player: Player): void {
        this.player = player;
    }

    /**
     * Called by CollisionController when the player overlaps a checkpoint entity.
     * Reads current game state from managers and saves a new snapshot.
     *
     * @param checkpointX  World-space X of the checkpoint entity.
     * @param checkpointY  World-space Y of the checkpoint entity.
     */
    onCheckpointReached(checkpointX: number, checkpointY: number): void {
        this.snapshot = {
            spawnX: checkpointX,
            spawnY: checkpointY,
            health: this.healthManager.getHp(),
            collectedCoinIds: this.coinManager.getCollectedIds(),
        };

        // TODO: play checkpoint activation animation / sound
        // TODO: prevent re-triggering the same checkpoint (mark as activated)
    }

    /**
     * Orchestrates the full respawn sequence.
     * Wired to HealthManager.onDied in Play.ts.
     */
    respawn(): void {
        if (!this.player) {
            console.error('CheckpointManager.respawn() called before setPlayer()');
            return;
        }

        const { spawnX, spawnY, health, collectedCoinIds } = this.snapshot;

        this.healthManager.setHealth(health);
        this.coinManager.restoreToSnapshot(collectedCoinIds);
        this.player.respawn(spawnX, spawnY);
        this.healthManager.clearIframes();

        // TODO: play respawn animation / fade-in effect
    }
}
