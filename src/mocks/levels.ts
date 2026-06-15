export type Level = {
    id: string;
    title: string;
    difficulty: string;
    totalPlays: number;
    completedCount: number;
    author: { username: string };
    published: boolean;
    createdAt: string;
    playedByMe: boolean;
    completedByMe: boolean;
};

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo  = (d: number) => hoursAgo(d * 24);

// Published levels shown in Browse view.
export const mockPublishedLevels: Level[] = [
    {
        id: 'pub-1',
        title: 'Grassland Beginnings',
        difficulty: 'easy',
        totalPlays: 342,
        completedCount: 280,
        author: { username: 'BlockBuster42' },
        published: true,
        createdAt: daysAgo(14),
        playedByMe: true,
        completedByMe: true,
    },
    {
        id: 'pub-2',
        title: 'Caverns of Echoes',
        difficulty: 'medium',
        totalPlays: 93,
        completedCount: 31,
        author: { username: 'BlockBuster42' },
        published: true,
        createdAt: daysAgo(3),
        playedByMe: true,
        completedByMe: false,
    },
    {
        id: 'pub-3',
        title: 'Skybridge Sprint',
        difficulty: 'hard',
        totalPlays: 210,
        completedCount: 18,
        author: { username: 'PixelAriel' },
        published: true,
        createdAt: daysAgo(5),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'pub-4',
        title: 'Nether Trial Alpha',
        difficulty: 'hard',
        totalPlays: 55,
        completedCount: 4,
        author: { username: 'BlockBuster42' },
        published: true,
        createdAt: hoursAgo(2),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'pub-5',
        title: 'Rolling Hills',
        difficulty: 'easy',
        totalPlays: 128,
        completedCount: 74,
        author: { username: 'BlockBuster42' },
        published: true,
        createdAt: daysAgo(2),
        playedByMe: true,
        completedByMe: true,
    },
    {
        id: 'pub-6',
        title: 'The Crystal Maze',
        difficulty: 'medium',
        totalPlays: 167,
        completedCount: 88,
        author: { username: 'PixelAriel' },
        published: true,
        createdAt: daysAgo(2),
        playedByMe: false,
        completedByMe: false,
    },
];

// Current user's own levels shown in My Levels view.
export const mockMyLevels: Level[] = [
    {
        id: 'my-1',
        title: 'Skybridge Sprint',
        difficulty: 'hard',
        totalPlays: 210,
        completedCount: 18,
        author: { username: 'PixelAriel' },
        published: true,
        createdAt: daysAgo(5),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'my-2',
        title: 'The Crystal Maze',
        difficulty: 'medium',
        totalPlays: 167,
        completedCount: 88,
        author: { username: 'PixelAriel' },
        published: true,
        createdAt: daysAgo(2),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'my-3',
        title: 'Lava Labyrinth',
        difficulty: 'hard',
        totalPlays: 0,
        completedCount: 0,
        author: { username: 'PixelAriel' },
        published: false,
        createdAt: hoursAgo(0.5),
        playedByMe: false,
        completedByMe: false,
    },
    {
        id: 'my-4',
        title: 'Bouncy Boulders WIP',
        difficulty: 'medium',
        totalPlays: 0,
        completedCount: 0,
        author: { username: 'PixelAriel' },
        published: false,
        createdAt: daysAgo(1),
        playedByMe: false,
        completedByMe: false,
    },
];
