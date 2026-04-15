export type ImageAssetConfig = {
    type: 'image';
    key: string;
    path: string;
};

export type SpritesheetAssetConfig = {
    type: 'spritesheet';
    key: string;
    path: string;
    frameWidth: number;
    frameHeight: number;
    margin?: number;
    spacing?: number;
};

export type AssetConfig = ImageAssetConfig | SpritesheetAssetConfig;

export const ASSET_CATALOG: AssetConfig[] = [
    { type: 'image', key: 'start-flag', path: 'assets/phaser/start-flag.png' },
    { type: 'image', key: 'end-flag', path: 'assets/phaser/end-flag.png' },
    { type: 'image', key: 'coin', path: 'assets/phaser/coin.png' },
    { type: 'image', key: 'red-cross', path: 'assets/phaser/icon_outline_cross.png' },

    { type: 'spritesheet', key: 'enemy', path: 'assets/phaser/enemy.png', frameWidth: 32, frameHeight: 32 },
    { type: 'spritesheet', key: 'dude', path: 'assets/phaser/dude.png', frameWidth: 32, frameHeight: 48 },
    { type: 'spritesheet', key: 'checkpoint-flag', path: 'assets/phaser/checkpoint-flag.png', frameWidth: 32, frameHeight: 64 },
    { type: 'spritesheet', key: 'platform', path: 'assets/phaser/platform-tiles.png', frameWidth: 32, frameHeight: 32 },
    {
        type: 'spritesheet',
        key: 'spikes',
        path: 'assets/phaser/spikes.png',
        frameWidth: 32,
        frameHeight: 32,
        margin: 0,
        spacing: 64,
    },
    { type: 'spritesheet', key: 'bg-tilesheet', path: 'assets/phaser/bg-tilesheet.png', frameWidth: 32, frameHeight: 32 },
    { type: 'spritesheet', key: 'fox', path: 'assets/phaser/fox.png', frameWidth: 32, frameHeight: 32 },
];