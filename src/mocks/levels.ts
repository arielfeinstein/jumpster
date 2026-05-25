export type Level = {
    id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    views: number;
    completed: number;
    authorName: string;
    published: boolean;
    createdAt: string;
    // Flags used to populate Browse → History tab until real API is wired.
    // TODO (wiring): derive these from /api/levels/history response instead.
    playedByMe: boolean;
    completedByMe: boolean;
};

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo  = (d: number) => hoursAgo(d * 24);

// Published levels shown in Browse view.
// TODO (wiring): replace with apiFetch('/api/levels?...') in BrowseLevels.tsx.
export const mockPublishedLevels: Level[] = [
    {
        id: 'pub-1',
        title: 'Grassland Beginnings',
        difficulty: 'easy',
        views: 342,
        completed: 280,
        authorName: 'BlockBuster42',
        published: true,
        createdAt: daysAgo(14),
        playedByMe: true,
        completedByMe: true,
    },
    {
        id: 'pub-2',
        title: 'Caverns of Echoes',
        difficulty: 'medium',
        views: 93,
        completed: 31,
        authorName: 'BlockBuster42',
        published: true,
        createdAt: daysAgo(3),
        playedByMe: true,
        completedByMe: false,
    },
    {
        id: 'pub-3',
        title: 'Skybridge Sprint',
        difficulty: 'hard',
        views: 210,
        completed: 18,
        authorName: 'PixelAriel',
        published: true,
        createdAt: daysAgo(5),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'pub-4',
        title: 'Nether Trial Alpha',
        difficulty: 'hard',
        views: 55,
        completed: 4,
        authorName: 'BlockBuster42',
        published: true,
        createdAt: hoursAgo(2),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'pub-5',
        title: 'Rolling Hills',
        difficulty: 'easy',
        views: 128,
        completed: 74,
        authorName: 'BlockBuster42',
        published: true,
        createdAt: daysAgo(2),
        playedByMe: true,
        completedByMe: true,
    },
    {
        id: 'pub-6',
        title: 'The Crystal Maze',
        difficulty: 'medium',
        views: 167,
        completed: 88,
        authorName: 'PixelAriel',
        published: true,
        createdAt: daysAgo(2),
        playedByMe: false,
        completedByMe: false,
    },
];

// Current user's own levels shown in My Levels view.
// TODO (wiring): replace with apiFetch('/api/levels/mine') in MyLevels.tsx.
export const mockMyLevels: Level[] = [
    {
        id: 'my-1',
        title: 'Skybridge Sprint',
        difficulty: 'hard',
        views: 210,
        completed: 18,
        authorName: 'PixelAriel',
        published: true,
        createdAt: daysAgo(5),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'my-2',
        title: 'The Crystal Maze',
        difficulty: 'medium',
        views: 167,
        completed: 88,
        authorName: 'PixelAriel',
        published: true,
        createdAt: daysAgo(2),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'my-3',
        title: 'Lava Labyrinth',
        difficulty: 'hard',
        views: 0,
        completed: 0,
        authorName: 'PixelAriel',
        published: false,
        createdAt: hoursAgo(0.5),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'my-4',
        title: 'Bouncy Boulders WIP',
        difficulty: 'medium',
        views: 0,
        completed: 0,
        authorName: 'PixelAriel',
        published: false,
        createdAt: daysAgo(1),
        playedByMe: false,
        completedByMe: false,
    },
];
