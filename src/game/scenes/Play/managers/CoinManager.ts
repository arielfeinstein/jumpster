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
 */

import Phaser from 'phaser';
import { CoinData } from '../../../shared/types/LevelData';
import EntityRegistry from '../../../shared/registry/EntityRegistry';
import Coin from '../../../shared/gameObjects/Coin';
import GameEntity, { ENTITY_DATA_KEY } from '../../../shared/gameObjects/GameEntity';

export default class CoinManager {

    /** All coin entity data from the level, keyed by stable entity ID. */
    private readonly allCoins: Map<string, CoinData> = new Map();

    /** Live Coin instances keyed by stable entity ID. Coins are never destroyed — only hidden/disabled. */
    private readonly coinEntities: Map<string, Coin> = new Map();

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
     * Registers and adds to scene all coins from level data.
     */
    loadFromLevelData(coinEntities: CoinData[]): void {
        for (const data of coinEntities) {
            const coin = EntityRegistry.create(this.scene, data) as Coin;
            coin.addToPhysics(this.collectibleGroup);
            this.allCoins.set(data.id, data);
            this.coinEntities.set(data.id, coin);
        }
    }

    /**
     * Hides the display object and disables its physics body without destroying it,
     * so it can be cheaply restored on checkpoint respawn.
     *
     * @param coinObject  The Phaser game object to hide.
     */
    collect(coinObject: Phaser.GameObjects.GameObject): void {
        const coin = coinObject.getData(ENTITY_DATA_KEY) as Coin;

        if (!coin || this.collectedIds.has(coin.id)) return; // already collected

        coin.onCollected();
        this.collectedIds.add(coin.id);
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
            const coin = this.coinEntities.get(id);
            if (!coin) continue;
            coin.displayObject.setVisible(true);
            (coin.displayObject as Phaser.Physics.Arcade.Image).body!.enable = true;
        }

        this.collectedIds = new Set(collectedAtCheckpoint);
        this.onCoinsChanged?.(this.collectedIds.size, this.allCoins.size);
    }
}
