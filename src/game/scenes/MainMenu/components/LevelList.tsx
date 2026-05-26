import { ReactNode } from 'react';
import type { Level } from '@/mocks/levels';
import styles from '../MainMenuUI.module.css';

interface LevelListProps {
    levels: Level[];
    renderActions: (level: Level) => ReactNode;
    /** Rendered between the level info and stats columns — use for badges. */
    renderBadge?: (level: Level) => ReactNode;
    emptyMessage?: string;
}

/**
 * Presentational list of levels.
 *
 * Renders each level as a row showing its title, author, age, play/completion
 * stats, and difficulty badge. Action buttons and optional status badges are
 * injected by the parent via render props, keeping this component view-only.
 */
export default function LevelList({ levels, renderActions, renderBadge, emptyMessage = 'No levels found.' }: LevelListProps) {
    if (levels.length === 0) {
        return <div className={styles.emptyMsg}>{emptyMessage}</div>;
    }
    return (
        <ul className={styles.levelList}>
            {levels.map(level => (
                <li key={level.id} className={styles.levelRow}>
                    <div className={styles.levelInfo}>
                        <span className={styles.levelTitle}>{level.title}</span>
                        <span className={styles.levelMeta}>
                            by {level.author.username} · {timeAgo(new Date(level.createdAt))}
                        </span>
                    </div>
                    {renderBadge && renderBadge(level)}
                    <div className={styles.levelStats}>
                        <span className={styles.stat}>👁 {level.totalPlays}</span>
                        <span className={styles.stat}>✓ {level.completedCount}</span>
                        <span className={`${styles.stat} ${diffClass(level.difficulty)}`}>
                            {level.difficulty}
                        </span>
                    </div>
                    <div className={styles.levelActions}>
                        {renderActions(level)}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function diffClass(difficulty: Level['difficulty']): string {
    if (difficulty === 'easy') return styles.diffEasy;
    if (difficulty === 'hard') return styles.diffHard;
    return styles.diffMedium;
}

function timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
