import { useMemo, useState } from 'react';
import { mockPublishedLevels } from '@/mocks/levels';
import styles from '../MainMenuUI.module.css';
import LevelList from './LevelList';

type SortOption = 'newest' | 'mostPlayed' | 'mostCompleted';
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type Tab = 'all' | 'history';
type HistoryFilter = 'all' | 'completed' | 'uncompleted';

interface BrowseLevelsProps {
    onBack: () => void;
}

export default function BrowseLevels({ onBack }: BrowseLevelsProps) {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortOption>('newest');
    const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
    const [tab, setTab] = useState<Tab>('all');
    const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
    // TODO (wiring): Replace with emitEvent('main-menu-play-level', { levelId: level.id })
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    const filtered = useMemo(() => {
        let result = mockPublishedLevels;
        // TODO (wiring): fetch from /api/levels?... and apply filters server-side instead

        if (tab === 'history') {
            result = result.filter(l => l.playedByMe);
            if (historyFilter === 'completed')   result = result.filter(l => l.completedByMe);
            if (historyFilter === 'uncompleted') result = result.filter(l => !l.completedByMe);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(l => l.title.toLowerCase().includes(q));
        }

        if (difficulty !== 'all') {
            result = result.filter(l => l.difficulty === difficulty);
        }

        if (sort === 'mostPlayed')    result = [...result].sort((a, b) => b.views - a.views);
        if (sort === 'mostCompleted') result = [...result].sort((a, b) => b.completed - a.completed);
        if (sort === 'newest')        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return result;
    }, [search, sort, difficulty, tab, historyFilter]);

    return (
        <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
                <button type="button" className={styles.backButton} onClick={onBack}>{'< Back'}</button>
                <span className={styles.contentTitle}>BROWSE LEVELS</span>
            </div>

            <div className={styles.filterBar}>
                <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Search levels..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select className={styles.select} value={sort} onChange={e => setSort(e.target.value as SortOption)}>
                    <option value="newest">Newest</option>
                    <option value="mostPlayed">Most Played</option>
                    <option value="mostCompleted">Most Completed</option>
                </select>
                <select className={styles.select} value={difficulty} onChange={e => setDifficulty(e.target.value as DifficultyFilter)}>
                    <option value="all">All Difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>

            <div className={styles.tabBar}>
                <button
                    type="button"
                    className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`}
                    onClick={() => setTab('all')}
                >
                    All
                </button>
                <button
                    type="button"
                    className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
                    onClick={() => setTab('history')}
                >
                    History
                    {/* TODO (wiring): fetch from /api/levels/history; replace playedByMe/completedByMe flags */}
                </button>
            </div>

            {tab === 'history' && (
                <div className={styles.historyFilters}>
                    {(['all', 'completed', 'uncompleted'] as HistoryFilter[]).map(f => (
                        <button
                            key={f}
                            type="button"
                            className={`${styles.chip} ${historyFilter === f ? styles.chipActive : ''}`}
                            onClick={() => setHistoryFilter(f)}
                        >
                            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            <LevelList
                levels={filtered}
                emptyMessage="No levels match your search."
                renderActions={level => (
                    <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => setActionMsg(`Would play: "${level.title}"`)}
                    >
                        Play
                    </button>
                )}
            />

            {actionMsg && <div className={styles.actionMessage}>▶ {actionMsg}</div>}
        </div>
    );
}
