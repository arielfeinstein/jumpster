import Phaser from 'phaser';
import { TILE_SIZE } from '../../config';
import Platform from '../../gameObjects/Platform';
import { EntityType } from './EditorUI';
import { EditorEntity, GameObject, Editor } from './Editor';
import GridManager from './GridManager';

export default class EntityManager {
    private scene: Editor;
    private gameObjMap: Map<string, EditorEntity>;

    constructor(scene: Editor, gameObjMap: Map<string, EditorEntity>) {
        this.scene = scene;
        this.gameObjMap = gameObjMap;
    }

    /**
     * Adds or removes the occupations of the tiles in the game object map.
     */
    public updateGameObjMap(editorEntity: EditorEntity, operation: 'add' | 'remove') {
        const gameObject = editorEntity.gameObject;

        for (let x = gameObject.x; x < gameObject.x + gameObject.width; x += TILE_SIZE) {
            for (let y = gameObject.y; y < gameObject.y + gameObject.height; y += TILE_SIZE) {
                const posKey = GridManager.getPositionKey(new Phaser.Math.Vector2(x, y));
                if (operation === 'add') {
                    this.gameObjMap.set(posKey, editorEntity);
                } else {
                    this.gameObjMap.delete(posKey);
                }
            }
        }
    }

    public getPlatformsBelow(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform): Set<Platform> {
        const platformsBelow: Set<Platform> = new Set();
        
        if (rect.y === this.scene.scale.height * this.scene.worldHeightUnit - TILE_SIZE) {
            return platformsBelow;
        }

        let y = rect.y + rect.height;
        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            const posBelowRectKey = GridManager.getPositionKey(new Phaser.Math.Vector2(x, y));
            const editorEntity = this.gameObjMap.get(posBelowRectKey);
            if (editorEntity?.entityType === 'platform') {
                platformsBelow.add(editorEntity.gameObject as Platform);
            }
        }

        return platformsBelow;
    }

    public getObjectsAbove(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform): Set<Phaser.GameObjects.Image | Platform> {
        const platformsAbove: Set<Phaser.GameObjects.Image | Platform> = new Set();

        if (rect.y === 0) return platformsAbove;

        let y = rect.y - TILE_SIZE;
        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            const posAboveRectKey = GridManager.getPositionKey(new Phaser.Math.Vector2(x, y));
            const editorEntity = this.gameObjMap.get(posAboveRectKey);
            if (editorEntity) {
                platformsAbove.add(editorEntity.gameObject);
            }
        }

        return platformsAbove;
    }

    /* return true if rect is overlapping with an occupied tile */
    public isOverlapping(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform): boolean {
        for (let x = rect.x; x < rect.x + rect.width; x += TILE_SIZE) {
            for (let y = rect.y; y < rect.y + rect.height; y += TILE_SIZE) {
                const posKey = GridManager.getPositionKey(new Phaser.Math.Vector2(x, y));
                if (this.gameObjMap.has(posKey)) {
                    // An object at this position already exists.
                    return true;
                }
            }
        }
        return false;
    }

    public canObjectBePlaced(rect: Phaser.Geom.Rectangle | Phaser.GameObjects.Image | Platform, entityType: EntityType): boolean {
        if (this.isOverlapping(rect)) {
            return false;
        }

        if ((entityType === 'start-flag' && this.scene.startFlag) || (entityType === 'end-flag' && this.scene.endFlag)) {
            return false; //can only be one start/end flag
        }

        let requirePlatformBelow = true;

        if (entityType === 'coin' || entityType === 'platform') {
            requirePlatformBelow = false;
        }

        if (requirePlatformBelow) {
            const platformsBelow = this.getPlatformsBelow(rect);
            if (platformsBelow.size === 0) {
                return false;
            }
        }
        return true;
    }
}
