import { Scene } from 'phaser';
import { ASSET_CATALOG, type AssetConfig } from '../../config/AssetCatalog';

export default class AssetLoaderManager {

    static loadAll(scene: Scene): void {
        ASSET_CATALOG.forEach((asset) => {
            this.loadAsset(scene, asset);
        });
    }

    private static loadAsset(scene: Scene, asset: AssetConfig): void {
        switch (asset.type) {
            case 'image':
                scene.load.image(asset.key, asset.path);
                break;
            case 'spritesheet':
                scene.load.spritesheet(asset.key, asset.path, {
                    frameWidth: asset.frameWidth,
                    frameHeight: asset.frameHeight,
                    margin: asset.margin,
                    spacing: asset.spacing,
                });
                break;
            default:
                break;
        }
    }
}