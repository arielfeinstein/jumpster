/**
 * CoinManager.ts
 *
 * Owns all coin state: which coins exist in the level, which have been
 * collected, and how to restore them to the world after a death.
 *
 * Coins collected AFTER the last checkpoint are "lost" on death and restored
 * to the world so the player can pick them up again.  Coins collected BEFORE
 * the last checkpoint are gone permanently (they're included in the checkpoint
 * snapshot and not recreated).
 *
 * Play.ts wires `onCoinsChanged` to emit to the React HUD.
 *
 * NOTE: Coins collected before the last checkpoint are gone permanently from the world.
 */

import Phaser from 'phaser';
import { CoinData } from '../../../shared/types/LevelData';
import EntityRegistry from '../../../shared/registry/EntityRegistry';

export default class CoinManager {

    /** All coin entity data from the level, keyed by stable entity ID. */
    private readonly allCoins: Map<string, CoinData> = new Map();

    /** IDs of coins the player has collected this run. */
    private collectedIds: Set<string> = new Set();

    private readonly scene: Phaser.Scene;
    private readonly collectibleGroup: Phaser.Physics.Arcade.StaticGroup;

    /** Wired by Play.ts → emits to React HUD. */
    onCoinsChanged?: (collected: number, total: number) => void;

    constructor(scene: Phaser.Scene, collectibleGroup: Phaser.Physics.Arcade.StaticGroup) {
        this.scene = scene;
        this.collectibleGroup = collectibleGroup;
    }

    /**
     * Registers all coins from level data.  Called once at level load time.
     * CoinManager takes over coin creation so it can track entity IDs for
     * restoration — the LevelSerializer skips 'collectible' entities.
     */
    loadFromLevelData(coinEntities: CoinData[]): void {
        // TODO: create each coin via EntityRegistry, add display object to collectibleGroup,
        //       enable physics, store EntityData in allCoins keyed by id
        for (const data of coinEntities) {
            this.allCoins.set(data.id, data);
        }
    }

    /**
     * Called by CollisionController when the player touches a coin.
     * Destroys the physics body and marks the coin as collected.
     *
     * @param coinId  Stable entity ID from the GameEntity.
     * @param coinObject  The Phaser game object to destroy.
     */
    collect(coinId: string, coinObject: Phaser.GameObjects.GameObject): void {
        if (this.collectedIds.has(coinId)) return; // already collected

        coinObject.destroy();
        this.collectedIds.add(coinId);
        this.onCoinsChanged?.(this.collectedIds.size, this.allCoins.size);
    }

    getCollectedIds(): Set<string> {
        // Return a copy so CheckpointManager's snapshot is immutable
        return new Set(this.collectedIds);
    }

    getTotalCount(): number { return this.allCoins.size; }
    getCollectedCount(): number { return this.collectedIds.size; }

    /**
     * Restores the world to the state captured at the last checkpoint.
     * Coins collected AFTER the snapshot are recreated in the world.
     * Coins in the snapshot remain permanently collected.
     *
     * @param collectedAtCheckpoint  Set of coin IDs that were already collected
     *                               when the player hit the checkpoint.
     */
    restoreToSnapshot(collectedAtCheckpoint: Set<string>): void {
        const toRestore = [...this.collectedIds].filter(id => !collectedAtCheckpoint.has(id));

        for (const id of toRestore) {
            const data = this.allCoins.get(id);
            if (!data) continue;

            // TODO: recreate coin via EntityRegistry, add to collectibleGroup, enable physics
            // const coin = EntityRegistry.create(data.entityType, this.scene, data.x, data.y, ...);
            // this.collectibleGroup.add(coin.getCollidables()[0]);
        }

        this.collectedIds = new Set(collectedAtCheckpoint);
        this.onCoinsChanged?.(this.collectedIds.size, this.allCoins.size);
    }
}
