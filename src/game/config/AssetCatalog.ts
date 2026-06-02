export const ASSET_KEYS = {
    START_FLAG:      'start-flag',
    END_FLAG:        'end-flag',
    COIN:            'coin',
    RED_CROSS:       'red-cross',
    ENEMY:           'enemy',
    DUDE:            'dude',
    CHECKPOINT_FLAG: 'checkpoint-flag',
    PLATFORM:        'platform',
    SPIKES:          'spikes',
    BG_TILESHEET:    'bg-tilesheet',
    FOX:             'fox',
} as const;

export type AssetKey = typeof ASSET_KEYS[keyof typeof ASSET_KEYS];

export type ImageAssetConfig = {
    type: 'image';
    key: AssetKey;
    path: string;
};

export type SpritesheetAssetConfig = {
    type: 'spritesheet';
    key: AssetKey;
    path: string;
    frameWidth: number;
    frameHeight: number;
    margin?: number;
    spacing?: number;
};

export type AssetConfig = ImageAssetConfig | SpritesheetAssetConfig;

export const ASSET_CATALOG: AssetConfig[] = [
    { type: 'image', key: ASSET_KEYS.START_FLAG, path: 'assets/phaser/start-flag.png' },
    { type: 'image', key: ASSET_KEYS.END_FLAG, path: 'assets/phaser/end-flag.png' },
    { type: 'image', key: ASSET_KEYS.COIN, path: 'assets/phaser/coin.png' },
    { type: 'image', key: ASSET_KEYS.RED_CROSS, path: 'assets/phaser/icon_outline_cross.png' },

    { type: 'spritesheet', key: ASSET_KEYS.ENEMY, path: 'assets/phaser/enemy.png', frameWidth: 32, frameHeight: 32 },
    { type: 'spritesheet', key: ASSET_KEYS.DUDE, path: 'assets/phaser/dude.png', frameWidth: 32, frameHeight: 48 },
    { type: 'spritesheet', key: ASSET_KEYS.CHECKPOINT_FLAG, path: 'assets/phaser/checkpoint-flag.png', frameWidth: 32, frameHeight: 64 },
    { type: 'spritesheet', key: ASSET_KEYS.PLATFORM, path: 'assets/phaser/platform-tiles.png', frameWidth: 32, frameHeight: 32 },
    {
        type: 'spritesheet',
        key: ASSET_KEYS.SPIKES,
        path: 'assets/phaser/spikes.png',
        frameWidth: 32,
        frameHeight: 32,
        margin: 0,
        spacing: 64,
    },
    { type: 'spritesheet', key: ASSET_KEYS.BG_TILESHEET, path: 'assets/phaser/bg-tilesheet.png', frameWidth: 32, frameHeight: 32 },
    { type: 'spritesheet', key: ASSET_KEYS.FOX, path: 'assets/phaser/fox.png', frameWidth: 32, frameHeight: 32 },
];
