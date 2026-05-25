import { useState } from 'react';
import { mockMyLevels, type Level } from '@/mocks/levels';
import styles from '../MainMenuUI.module.css';
import LevelList from './LevelList';

interface MyLevelsProps {
    onBack: () => void;
}

export default function MyLevels({ onBack }: MyLevelsProps) {
    // TODO (wiring): replace initial state with apiFetch('/api/levels/mine')
    const [levels, setLevels] = useState<Level[]>(mockMyLevels);
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    function handlePublish(id: string) {
        // TODO (wiring): call PATCH /api/levels/:id with { published: true } before updating state
        setLevels(prev => prev.map(l => l.id === id ? { ...l, published: true } : l));
        setActionMsg(null);
    }

    function handleDelete(id: string, title: string) {
        // TODO (wiring): call DELETE /api/levels/:id before removing from state
        setLevels(prev => prev.filter(l => l.id !== id));
        setActionMsg(`Deleted: "${title}"`);
    }

    function handleEdit(level: Level) {
        // TODO (wiring): Replace with emitEvent('main-menu-edit-level', { levelId: level.id })
        setActionMsg(`Would edit: "${level.title}"`);
    }

    function handleTemplate(level: Level) {
        // TODO (wiring): Replace with POST /api/levels/:id/duplicate, then emitEvent('main-menu-edit-level', { levelId: newId })
        setActionMsg(`Would use as template: "${level.title}"`);
    }

    return (
        <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
                <button type="button" className={styles.backButton} onClick={onBack}>{'< Back'}</button>
                <span className={styles.contentTitle}>MY LEVELS</span>
            </div>

            <LevelList
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
            />

            {actionMsg && <div className={styles.actionMessage}>▶ {actionMsg}</div>}
        </div>
    );
}
