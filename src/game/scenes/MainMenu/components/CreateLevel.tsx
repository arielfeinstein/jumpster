import { useState } from 'react';
import { mockMyLevels } from '@/mocks/levels';
import styles from '../MainMenuUI.module.css';
import LevelList from './LevelList';

interface CreateLevelProps {
    onBack: () => void;
}

type Mode = 'choice' | 'picker';

export default function CreateLevel({ onBack }: CreateLevelProps) {
    const [mode, setMode] = useState<Mode>('choice');
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    function handleNewLevel() {
        // TODO (wiring): Replace with emitEvent('main-menu-edit-level', { levelId: '' })
        setActionMsg('Would open editor for a new level');
    }

    function handleSelectTemplate(title: string) {
        // TODO (wiring): POST /api/levels/:id/duplicate to clone the level,
        //   then emitEvent('main-menu-edit-level', { levelId: newLevel.id })
        setActionMsg(`Would use "${title}" as template`);
        setMode('choice');
    }

    if (mode === 'picker') {
        return (
            <div className={styles.contentPanel}>
                <div className={styles.contentHeader}>
                    <button type="button" className={styles.backButton} onClick={() => setMode('choice')}>{'< Back'}</button>
                    <span className={styles.contentTitle}>USE AS TEMPLATE</span>
                </div>
                <LevelList
                    levels={mockMyLevels}
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
                            onClick={() => handleSelectTemplate(level.title)}
                        >
                            Select
                        </button>
                    )}
                />
                {actionMsg && <div className={styles.actionMessage}>▶ {actionMsg}</div>}
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
                {actionMsg && <div className={styles.actionMessage}>▶ {actionMsg}</div>}
            </div>
        </div>
    );
}
