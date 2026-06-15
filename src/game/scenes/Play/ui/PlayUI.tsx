/**
 * PlayUI.tsx
 *
 * React HUD overlay for the Play scene.
 *
 * Rendered as a fixed full-screen transparent overlay (pointer-events: none)
 * so all mouse/touch input passes through to Phaser by default. Only
 * interactive UI regions (the pause menu) opt back in with pointer-events: auto.
 *
 * Communication with Phaser goes entirely through EventBus:
 *   Phaser → React:  'play-ready', 'play-health-changed', 'play-coins-changed',
 *                    'play-pause', 'play-resume'
 *   React → Phaser:  'play-resume'  (Resume button in PauseMenu)
 */

import { useState, useEffect } from 'react';
import { EventBus, emitEvent, onEvent } from '../../../EventBus';
import { EventBusRegistry } from '../../../shared/registry/EventRegistry';
import styles from './PlayUI.module.css';

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function PlayUI() {
    const [hp, setHp] = useState(0);
    const [maxHp, setMaxHp] = useState(0);
    const [coinsCollected, setCoinsCollected] = useState(0);
    const [totalCoins, setTotalCoins] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [levelComplete, setLevelComplete] = useState<{ coinsCollected: number; totalCoins: number } | null>(null);

    /**
     * isReady gates the entire HUD. It stays false until 'play-ready' fires,
     * so we never render stale zeroed-out values during scene load.
     */
    const [isReady, setIsReady] = useState(false);

    // Subscribe to all Play scene events once on mount, clean up on unmount.
    useEffect(() => {
        const onReady = (payload: EventBusRegistry['play-ready']) => {
            setHp(payload.hp);
            setMaxHp(payload.maxHp);
            setCoinsCollected(payload.coinsCollected);
            setTotalCoins(payload.totalCoins);
            setIsReady(true);
        };

        const onHealthChanged = (payload: EventBusRegistry['play-health-changed']) => {
            setHp(payload.hp);
        };

        const onCoinsChanged = (payload: EventBusRegistry['play-coins-changed']) => {
            setCoinsCollected(payload.coinsCollected);
        };

        const onPause = () => setIsPaused(true);
        const onResume = () => setIsPaused(false);

        const onRestart = () => {
            setIsPaused(false);
            setIsReady(false);
            setLevelComplete(null);
        };

        const onSessionEnded = ({ coinsCollected, totalCoins }: EventBusRegistry['play-session-ended']) => {
            setLevelComplete({ coinsCollected, totalCoins });
        };

        onEvent('play-ready', onReady);
        onEvent('play-health-changed', onHealthChanged);
        onEvent('play-coins-changed', onCoinsChanged);
        onEvent('play-pause', onPause);
        onEvent('play-resume', onResume);
        onEvent('play-restart', onRestart);
        onEvent('play-session-ended', onSessionEnded);

        // Listeners are registered — ask Phaser for current state.
        // play-ready may have already fired before this component mounted.
        emitEvent('play-request-ready', {});

        return () => {
            EventBus.off('play-ready', onReady);
            EventBus.off('play-health-changed', onHealthChanged);
            EventBus.off('play-coins-changed', onCoinsChanged);
            EventBus.off('play-pause', onPause);
            EventBus.off('play-resume', onResume);
            EventBus.off('play-restart', onRestart);
            EventBus.off('play-session-ended', onSessionEnded);
        };
    }, []);

    if (!isReady) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.hud}>
                <HealthBar hp={hp} maxHp={maxHp} />
                <CoinCounter collected={coinsCollected} total={totalCoins} />
            </div>
            {isPaused && <PauseMenu />}
            {levelComplete && (
                <LevelCompleteOverlay
                    coinsCollected={levelComplete.coinsCollected}
                    totalCoins={levelComplete.totalCoins}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// HealthBar
// ---------------------------------------------------------------------------

function HealthBar({ hp, maxHp }: { hp: number; maxHp: number }) {
    return (
        <div className={styles.healthBar}>
            {Array.from({ length: maxHp }, (_, i) => (
                <img
                    key={i}
                    src={i < hp ? '/assets/react/heart-full.png' : '/assets/react/heart-empty.png'}
                    alt={i < hp ? 'full heart' : 'empty heart'}
                    className={styles.heart}
                />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CoinCounter
// ---------------------------------------------------------------------------

function CoinCounter({ collected, total }: { collected: number; total: number }) {
    return (
        <div className={styles.coinCounter}>
            <img src="/assets/phaser/coin.png" alt="coin" className={styles.coinIcon} />
            <span>{collected} / {total}</span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// PauseMenu
// ---------------------------------------------------------------------------

function PauseMenu() {
    return (
        <div className={styles.pauseOverlay}>
            <div className={styles.pausePanel}>
                <h2 className={styles.pauseTitle}>PAUSED</h2>
                <button
                    type="button"
                    className={styles.menuButton}
                    onClick={() => emitEvent('play-resume', {})}
                >
                    Resume
                </button>
                <button
                    type="button"
                    className={styles.menuButton}
                    onClick={() => emitEvent('play-restart', {})}
                >
                    Restart
                </button>
                <button
                    type="button"
                    className={styles.menuButton}
                    onClick={() => emitEvent('play-go-to-main-menu', {})}
                >
                    Main Menu
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// LevelCompleteOverlay
// ---------------------------------------------------------------------------

function LevelCompleteOverlay({ coinsCollected, totalCoins }: { coinsCollected: number; totalCoins: number }) {
    const allCoins = coinsCollected === totalCoins;
    return (
        <div className={styles.pauseOverlay}>
            <div className={styles.pausePanel}>
                <h2 className={`${styles.winTitle}${allCoins ? ` ${styles.allCoins}` : ''}`}>
                    YOU WIN!
                </h2>
                <div className={styles.coinCounter}>
                    <img src="/assets/phaser/coin.png" alt="coin" className={styles.coinIcon} />
                    <span>{coinsCollected} / {totalCoins}</span>
                </div>
                <button
                    type="button"
                    className={styles.menuButton}
                    onClick={() => emitEvent('play-restart', {})}
                >
                    Play Again
                </button>
                <button
                    type="button"
                    className={styles.menuButton}
                    onClick={() => emitEvent('play-go-to-main-menu', {})}
                >
                    Main Menu
                </button>
            </div>
        </div>
    );
}
