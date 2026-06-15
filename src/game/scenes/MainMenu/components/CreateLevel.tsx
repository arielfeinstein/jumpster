import { useState, useEffect } from 'react';
import { type Level } from '@/mocks/levels';
import { emitEvent } from '@/game/EventBus';
import { apiFetch } from '@/lib/api';
import type { LevelData } from '@/game/shared/types/LevelData';
import type { Difficulty } from '@/game/shared/types/Difficulty';
import styles from '../MainMenuUI.module.css';
import LevelList from './LevelList';

interface CreateLevelProps {
    onBack: () => void;
}

type Mode = 'choice' | 'picker';

export default function CreateLevel({ onBack }: CreateLevelProps) {
    const [mode, setMode] = useState<Mode>('choice');
    const [myLevels, setMyLevels] = useState<Level[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (mode !== 'picker') return;
        setLoading(true);
        apiFetch('/api/levels/mine')
            .then(res => res.json())
            .then(({ levels }) => setMyLevels(levels))
            .finally(() => setLoading(false));
    }, [mode]);

    function handleNewLevel() {
        emitEvent('main-menu-edit-level', {});
    }

    async function handleSelectTemplate(level: Level) {
        const res = await apiFetch(`/api/levels/${level.id}`);
        if (!res.ok) { console.error('[CreateLevel] failed to load template'); return; }
        const { level: loaded } = await res.json();
        emitEvent('main-menu-edit-level', { levelData: loaded.data as LevelData, difficulty: level.difficulty as Difficulty });
    }

    if (mode === 'picker') {
        return (
            <div className={styles.contentPanel}>
                <div className={styles.contentHeader}>
                    <button type="button" className={styles.backButton} onClick={() => setMode('choice')}>{'< Back'}</button>
                    <span className={styles.contentTitle}>USE AS TEMPLATE</span>
                </div>
                {loading ? (
                    <p className={styles.emptyMessage}>Loading…</p>
                ) : (
                    <LevelList
                        levels={myLevels}
                        emptyMessage="You have no levels to use as a template."
                        renderBadge={level => (
                            <span className={`${styles.badge} ${level.published ? styles.badgePublished : styles.badgeDraft}`}>
                                {level.published ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                        )}
                        renderActions={level => (
                            <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() => handleSelectTemplate(level)}
                            >
                                Select
                            </button>
                        )}
                    />
                )}
            </div>
        );
    }

    return (
        <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
                <button type="button" className={styles.backButton} onClick={onBack}>{'< Back'}</button>
                <span className={styles.contentTitle}>CREATE LEVEL</span>
            </div>
            <div className={styles.createBody}>
                <div className={styles.createHint}>Start fresh or base it on an existing level.</div>
                <button type="button" className={styles.menuButton} onClick={handleNewLevel}>
                    New Level
                </button>
                <button type="button" className={styles.menuButton} onClick={() => setMode('picker')}>
                    Use as Template
                </button>
            </div>
        </div>
    );
}
