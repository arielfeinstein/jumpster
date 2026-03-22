import Phaser from 'phaser';
import { EntityType } from './EditorUI';
import { TILE_SIZE } from '../../config';
import Platform from '../../gameObjects/Platform';
import GridManager from './GridManager';
import EntityManager from './EntityManager';
import SelectionController from './SelectionController';
import ObjectDragController from './ObjectDragController';
import { Editor, GameObject } from './Editor';

export type PlacementRequest = {
    entityType: EntityType;
    x: number;
    y: number;
};

export default class PlacementController {
    constructor(
        private scene: Editor,
        private entityManager: EntityManager,
        private selectionController: SelectionController,
        private objectDragController: ObjectDragController,
    ) {}

    public placeEntity = ({ entityType, x, y }: PlacementRequest): GameObject | null => {
        // Prevent selection drag from starting immediately after UI placement.
        this.scene.input.activePointer.isDown = false;

        const snappedPos = new Phaser.Math.Vector2(x, y);
        GridManager.updateToSnappedCoord(snappedPos);

        const geomRect = this.getPlacementRect(entityType, snappedPos);
        if (!this.entityManager.canObjectBePlaced(geomRect, entityType)) {
            return null;
        }

        const gameObject = this.createGameObject(entityType, geomRect);
        this.setupInteractivity(gameObject, entityType);

        this.entityManager.updateGameObjMap({ entityType, gameObject }, 'add');

        const platformsBelow = this.entityManager.getPlatformsBelow(gameObject);
        platformsBelow.forEach(platformBelow => {
            platformBelow.addObjectOnIt(gameObject);
        });

        return gameObject;
    }

    private getPlacementRect(entityType: EntityType, snappedPos: Phaser.Math.Vector2): Phaser.Geom.Rectangle {
        if (entityType === 'platform' || entityType === 'enemy' || entityType === 'coin') {
            return new Phaser.Geom.Rectangle(snappedPos.x, snappedPos.y, TILE_SIZE, TILE_SIZE);
        }

        return new Phaser.Geom.Rectangle(snappedPos.x, snappedPos.y, TILE_SIZE, TILE_SIZE * 2);
    }

    private createGameObject(entityType: EntityType, geomRect: Phaser.Geom.Rectangle): GameObject {
        let gameObject: GameObject;

        switch (entityType) {
            case 'platform':
                gameObject = new Platform(this.scene, geomRect.x, geomRect.y, geomRect.width, geomRect.height);
                const objectsOnIt = this.entityManager.getObjectsAbove(gameObject);
                objectsOnIt.forEach(objectOnIt => {
                    (gameObject as Platform).addObjectOnIt(objectOnIt);
                });
                break;
            case 'enemy':
                gameObject = this.scene.add.image(geomRect.x, geomRect.y, entityType, 1).setOrigin(0, 0);
                break;
            case 'coin':
                gameObject = this.scene.add.image(geomRect.x, geomRect.y, entityType).setOrigin(0, 0);
                break;
            case 'checkpoint':
                gameObject = this.scene.add.image(geomRect.x, geomRect.y, 'checkpoint-flag', 4).setOrigin(0, 0);
                break;
            case 'start-flag':
                gameObject = this.scene.add.image(geomRect.x, geomRect.y, entityType).setOrigin(0, 0);
                this.scene.startFlag = gameObject;
                break;
            case 'end-flag':
                gameObject = this.scene.add.image(geomRect.x, geomRect.y, entityType).setOrigin(0, 0);
                this.scene.endFlag = gameObject;
                break;
        }

        return gameObject;
    }

    private setupInteractivity(gameObject: GameObject, entityType: EntityType): void {
        if (entityType !== 'platform') {
            gameObject.setInteractive({ draggable: true });
        }

        gameObject.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
            this.selectionController.selectObjects(new Set([gameObject]));
            this.selectionController.disableSelectDrag = true;
            event.stopPropagation();
        });

        this.objectDragController.setupDrag(gameObject, entityType);
    }
}
