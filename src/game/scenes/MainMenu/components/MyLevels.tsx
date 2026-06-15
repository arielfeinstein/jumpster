import { useState, useEffect } from 'react';
import { type Level } from '@/mocks/levels';
import { EventBus } from '@/game/EventBus';
import { apiFetch } from '@/lib/api';
import type { LevelData } from '@/game/shared/types/LevelData';
import type { Difficulty } from '@/game/shared/types/Difficulty';
import styles from '../MainMenuUI.module.css';
import LevelList from './LevelList';

interface MyLevelsProps {
    onBack: () => void;
}

export default function MyLevels({ onBack }: MyLevelsProps) {
    const [levels, setLevels] = useState<Level[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    useEffect(() => {
        apiFetch('/api/levels/mine')
            .then(res => res.json())
            .then(({ levels }) => setLevels(levels))
            .finally(() => setLoading(false));
    }, []);

    async function handlePublish(id: string) {
        const res = await apiFetch(`/api/levels/${id}/publish`, { method: 'POST' });
        if (!res.ok) { setActionMsg('Failed to publish level.'); return; }
        setLevels(prev => prev.map(l => l.id === id ? { ...l, published: true } : l));
        setActionMsg('Level published!');
    }

    async function handleDelete(id: string, title: string) {
        const res = await apiFetch(`/api/levels/${id}`, { method: 'DELETE' });
        if (!res.ok) { setActionMsg('Failed to delete level.'); return; }
        setLevels(prev => prev.filter(l => l.id !== id));
        setActionMsg(`Deleted: "${title}"`);
    }

    async function handleEdit(level: Level) {
        const res = await apiFetch(`/api/levels/${level.id}`);
        if (!res.ok) { console.error('[MyLevels] failed to load level'); return; }
        const { level: loaded } = await res.json();
        EventBus.emit('main-menu-edit-level', { levelId: level.id, levelData: loaded.data as LevelData, difficulty: level.difficulty as Difficulty });
    }

    async function handleTemplate(level: Level) {
        const res = await apiFetch(`/api/levels/${level.id}`);
        if (!res.ok) { console.error('[MyLevels] failed to load template'); return; }
        const { level: loaded } = await res.json();
        EventBus.emit('main-menu-edit-level', { levelData: loaded.data as LevelData, difficulty: level.difficulty as Difficulty });
    }

    return (
        <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
                <button type="button" className={styles.backButton} onClick={onBack}>{'< Back'}</button>
                <span className={styles.contentTitle}>MY LEVELS</span>
            </div>

            {loading && <div className={styles.spinner} />}
            {!loading && <LevelList
                levels={levels}
                emptyMessage="You have no levels yet."
                renderBadge={level => (
                    <span className={`${styles.badge} ${level.published ? styles.badgePublished : styles.badgeDraft}`}>
                        {level.published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                )}
                renderActions={level => (
                    <>
                        {!level.published && (
                            <button type="button" className={styles.actionButton} onClick={() => handleEdit(level)}>
                                Edit
                            </button>
                        )}
                        {!level.published && (
                            <button type="button" className={styles.actionButton} onClick={() => handlePublish(level.id)}>
                                Publish
                            </button>
                        )}
                        <button type="button" className={styles.actionButton} onClick={() => handleTemplate(level)}>
                            Use as Template
                        </button>
                        <button
                            type="button"
                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                            onClick={() => handleDelete(level.id, level.title)}
                        >
                            Delete
                        </button>
                    </>
                )}
            />}

            {actionMsg && <div className={styles.actionMessage}>▶ {actionMsg}</div>}
        </div>
    );
}
