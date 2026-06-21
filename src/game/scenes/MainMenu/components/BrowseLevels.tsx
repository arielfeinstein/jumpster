import { useEffect, useMemo, useState } from 'react';
import type { Level } from '@/mocks/levels';
import { apiFetch } from '@/lib/api';
import { emitEvent } from '@/game/EventBus';
import type { LevelData } from '@/game/shared/types/LevelData';
import styles from '../MainMenuUI.module.css';
import LevelList from './LevelList';

type SortOption = 'newest' | 'mostPlayed' | 'mostCompleted';
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type Tab = 'all' | 'history' | 'bookmarks';
type HistoryFilter = 'all' | 'completed' | 'uncompleted';

interface BrowseLevelsProps {
    onBack: () => void;
}

/**
 * Full-screen panel that lets the player discover and launch community levels.
 *
 * Displays all published levels fetched from the server. The player can search
 * by title, filter by difficulty, sort by recency or popularity, and switch between
 * tabs for All levels, History (levels they've played), and Bookmarks.
 *
 * Like and bookmark toggles update the level list state optimistically so the UI
 * responds immediately without waiting for a round-trip.
 *
 * Clicking Play on a level emits a `main-menu-play-level` event so the Phaser
 * MainMenu scene can transition into the Play scene.
 */
export default function BrowseLevels({ onBack }: BrowseLevelsProps) {
    // Remote data
    const [levels, setLevels]   = useState<Level[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    // Filter / sort controls
    const [search, setSearch]               = useState('');
    const [sort, setSort]                   = useState<SortOption>('newest');
    const [difficulty, setDifficulty]       = useState<DifficultyFilter>('all');
    const [tab, setTab]                     = useState<Tab>('all');
    const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

    // Fetch all published levels once on mount. The response already includes
    // per-user flags (playedByMe, completedByMe, likedByMe, bookmarkedByMe) so
    // no second request is needed to populate tab state.
    useEffect(() => {
        apiFetch('/api/levels')
            .then(res => {
                if (!res.ok) throw new Error(`Failed to load levels (${res.status})`);
                return res.json() as Promise<{ levels: Level[] }>;
            })
            .then(({ levels }) => setLevels(levels))
            .catch(err => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, []);

    // Apply tab, search, difficulty, and sort client-side on the full level list.
    const filtered = useMemo(() => {
        let result = levels;

        // History tab: narrow to levels the user has played, then optionally
        // further narrow to completed or uncompleted.
        if (tab === 'history') {
            result = result.filter(l => l.playedByMe);
            if (historyFilter === 'completed')   result = result.filter(l => l.completedByMe);
            if (historyFilter === 'uncompleted') result = result.filter(l => !l.completedByMe);
        }

        // Bookmarks tab: narrow to levels the user has bookmarked.
        if (tab === 'bookmarks') {
            result = result.filter(l => l.bookmarkedByMe);
        }

        // Title search (case-insensitive substring match).
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(l => l.title.toLowerCase().includes(q));
        }

        // Difficulty filter.
        if (difficulty !== 'all') {
            result = result.filter(l => l.difficulty === difficulty);
        }

        // Sort — spreads to avoid mutating the filtered reference in place.
        if (sort === 'mostPlayed')    result = [...result].sort((a, b) => b.totalPlays - a.totalPlays);
        if (sort === 'mostCompleted') result = [...result].sort((a, b) => b.completedCount - a.completedCount);
        if (sort === 'newest')        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return result;
    }, [levels, search, sort, difficulty, tab, historyFilter]);

    async function handlePlay(levelId: string) {
        const res = await apiFetch(`/api/levels/${levelId}`);
        if (!res.ok) { console.error('[BrowseLevels] failed to load level'); return; }
        const { level } = await res.json();
        emitEvent('main-menu-play-level', { levelId, levelData: level.data as LevelData });
    }

    /**
     * Toggles a like on the given level. Updates state optimistically:
     * flips likedByMe and adjusts likeCount by ±1 immediately so the UI
     * responds without waiting for the server response.
     */
    async function handleLike(levelId: string) {
        // Optimistic update — flip before awaiting the response.
        setLevels(prev => prev.map(l =>
            l.id === levelId
                ? { ...l, likedByMe: !l.likedByMe, likeCount: l.likeCount + (l.likedByMe ? -1 : 1) }
                : l
        ));

        const res = await apiFetch(`/api/levels/${levelId}/like`, { method: 'POST' });
        if (!res.ok) {
            // Roll back the optimistic update on failure.
            setLevels(prev => prev.map(l =>
                l.id === levelId
                    ? { ...l, likedByMe: !l.likedByMe, likeCount: l.likeCount + (l.likedByMe ? -1 : 1) }
                    : l
            ));
            return;
        }
        // Reconcile with the authoritative server value.
        const { liked } = await res.json() as { liked: boolean };
        setLevels(prev => prev.map(l =>
            l.id === levelId
                ? { ...l, likedByMe: liked, likeCount: l.likeCount + (liked !== l.likedByMe ? (liked ? 1 : -1) : 0) }
                : l
        ));
    }

    /**
     * Toggles a bookmark on the given level. Updates bookmarkedByMe optimistically
     * so the Bookmarks tab updates in real time without a reload.
     */
    async function handleBookmark(levelId: string) {
        // Optimistic update.
        setLevels(prev => prev.map(l =>
            l.id === levelId ? { ...l, bookmarkedByMe: !l.bookmarkedByMe } : l
        ));

        const res = await apiFetch(`/api/levels/${levelId}/bookmark`, { method: 'POST' });
        if (!res.ok) {
            // Roll back on failure.
            setLevels(prev => prev.map(l =>
                l.id === levelId ? { ...l, bookmarkedByMe: !l.bookmarkedByMe } : l
            ));
            return;
        }
        const { bookmarked } = await res.json() as { bookmarked: boolean };
        setLevels(prev => prev.map(l =>
            l.id === levelId ? { ...l, bookmarkedByMe: bookmarked } : l
        ));
    }

    return (
        <div className={styles.contentPanel}>
            {/* Header */}
            <div className={styles.contentHeader}>
                <button type="button" className={styles.backButton} onClick={onBack}>{'< Back'}</button>
                <span className={styles.contentTitle}>BROWSE LEVELS</span>
            </div>

            {/* Search, sort, and difficulty controls */}
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

            {/* All / History / Bookmarks tab switcher */}
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
                    {/* History tab filters on playedByMe / completedByMe flags already returned by
                        GET /api/levels — no separate history endpoint needed.
                        Wire POST /api/levels/:id/play from the play scene on level load to populate playedByMe. */}
                </button>
                <button
                    type="button"
                    className={`${styles.tab} ${tab === 'bookmarks' ? styles.tabActive : ''}`}
                    onClick={() => setTab('bookmarks')}
                >
                    Bookmarks
                </button>
            </div>

            {/* Completed / uncompleted sub-filter — only visible on the History tab */}
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

            {/* Level list — gated behind loading/error states */}
            {loading && <div className={styles.emptyMsg}>Loading levels…</div>}
            {error   && <div className={styles.emptyMsg}>Error: {error}</div>}
            {!loading && !error && tab !== 'bookmarks' && (
                <LevelList
                    levels={filtered}
                    emptyMessage="No levels match your search."
                    onLike={level => handleLike(level.id)}
                    onBookmark={level => handleBookmark(level.id)}
                    renderActions={level => (
                        <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handlePlay(level.id)}
                        >
                            Play
                        </button>
                    )}
                />
            )}
            {!loading && !error && tab === 'bookmarks' && (
                <LevelList
                    levels={filtered}
                    emptyMessage="You haven't bookmarked any levels yet."
                    onLike={level => handleLike(level.id)}
                    onBookmark={level => handleBookmark(level.id)}
                    renderActions={level => (
                        <>
                            {/* Remove bookmark first so it's on the left, then Play */}
                            <button
                                type="button"
                                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                onClick={() => handleBookmark(level.id)}
                            >
                                Remove
                            </button>
                            <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() => handlePlay(level.id)}
                            >
                                Play
                            </button>
                        </>
                    )}
                />
            )}
        </div>
    );
}
