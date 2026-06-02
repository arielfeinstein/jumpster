import { ASSET_KEYS, type AssetKey } from './AssetCatalog';

export const ANIMATION_KEYS = {
    FOX_IDLE: 'fox-idle',
    FOX_JUMP: 'fox-jump',
    FOX_FALL: 'fox-fall',
    FOX_HIT_GROUND: 'fox-hit-ground',
    FOX_RUN: 'fox-run',
    GOOMBA_STOMP: 'goomba-stomp',
    GOOMBA_WALK: 'goomba-walk',
    FLAG_RAISE: 'flag-raise',
} as const;

export type AnimationKey = typeof ANIMATION_KEYS[keyof typeof ANIMATION_KEYS];

export type AnimationConfig = {
    key: AnimationKey;
    textureKey: AssetKey;
    startFrame: number;
    endFrame: number;
    frameRate: number;
    repeat?: number;
};

export const PLAYER_ANIMATIONS: AnimationConfig[] = [
    {
        key: ANIMATION_KEYS.FOX_IDLE,
        textureKey: ASSET_KEYS.FOX,
        startFrame: 0,
        endFrame: 10,
        frameRate: 20,
        repeat: -1,
    },
    {
        key: ANIMATION_KEYS.FOX_JUMP,
        textureKey: ASSET_KEYS.FOX,
        startFrame: 11,
        endFrame: 11,
        frameRate: 10,
    },
    {
        key: ANIMATION_KEYS.FOX_FALL,
        textureKey: ASSET_KEYS.FOX,
        startFrame: 12,
        endFrame: 12,
        frameRate: 10,
    },
    {
        key: ANIMATION_KEYS.FOX_HIT_GROUND,
        textureKey: ASSET_KEYS.FOX,
        startFrame: 13,
        endFrame: 17,
        frameRate: 20,
    },
    {
        key: ANIMATION_KEYS.FOX_RUN,
        textureKey: ASSET_KEYS.FOX,
        startFrame: 18,
        endFrame: 29,
        frameRate: 20,
        repeat: -1,
    },
];

export const ENEMY_ANIMATIONS: AnimationConfig[] = [
    {
        key: ANIMATION_KEYS.GOOMBA_STOMP,
        textureKey: ASSET_KEYS.ENEMY,
        startFrame: 3,
        endFrame: 3,
        frameRate: 10,
    },
    {
        key: ANIMATION_KEYS.GOOMBA_WALK,
        textureKey: ASSET_KEYS.ENEMY,
        startFrame: 0,
        endFrame: 2,
        frameRate: 10,
        repeat: -1,
    },
];

export const FLAG_ANIMATIONS: AnimationConfig[] = [
    {
        key: ANIMATION_KEYS.FLAG_RAISE,
        textureKey: ASSET_KEYS.CHECKPOINT_FLAG,
        startFrame: 0,
        endFrame: 4,
        frameRate: 10,
    }
];
