import Phaser from 'phaser';
import Platform from '../../gameObjects/Platform';
import { EntityType } from './EditorUI';
import { Editor, RED_TINT, GameObject } from './Editor';

export default class ObjectDragController {
    
    constructor(private scene: Editor) {}

    setupDrag(object: GameObject, entityType: EntityType) {
        let ghostDrag: Phaser.GameObjects.Image | Platform | null = null;
        let platformsBelowBeforeDrag: Set<Platform>;

        let tempStartFlag: Phaser.GameObjects.Image | null;
        let tempEndFlag: Phaser.GameObjects.Image | null;

        const snappedPointerCoord = new Phaser.Math.Vector2();


        // Drag events
        object.on(
            "dragstart",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

                this.scene.selectionController.disableSelectDrag = true;

                // used to avoid placement logic check errors
                tempStartFlag = this.scene.startFlag;
                tempEndFlag = this.scene.endFlag;
                this.scene.startFlag = null;
                this.scene.endFlag = null;

                platformsBelowBeforeDrag = this.scene.getPlatformsBelow(object);

                if (entityType === 'platform') {
                    ghostDrag = new Platform(this.scene, object.x, object.y, object.width, object.height)
                }
                else if (entityType === 'enemy' || entityType === 'coin') {
                    ghostDrag = this.scene.add.image(object.x, object.y, entityType).setOrigin(0, 0);
                }
                else {
                    ghostDrag = this.scene.getFlagImage(entityType, new Phaser.Math.Vector2(object.x, object.y));
                    this.scene.add.existing(ghostDrag);
                }

                ghostDrag.setAlpha(0.5);
                
                this.scene.selectionController.deselectAllObjects();
            }
        );
        object.on(
            "drag",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                // calculate current pointer snapped coord
                snappedPointerCoord.x = pointer.worldX;
                snappedPointerCoord.y = pointer.worldY;
                this.scene.updateToSnappedCoord(snappedPointerCoord);

                ghostDrag!.x = snappedPointerCoord.x;
                ghostDrag!.y = snappedPointerCoord.y;

                if (!this.scene.canObjectBePlaced(ghostDrag!, entityType)) {
                    ghostDrag!.setTint(RED_TINT);
                }
                else {
                    ghostDrag!.clearTint();
                }
            }
        );
        object.on(
            "dragend",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {

                if (ghostDrag!.tint === RED_TINT) {
                    // invalid position - do nothing
                }
                else {
                    // valid position - move the enemy and update the map
                    this.scene.updateGameObjMap({ entityType: entityType, gameObject: object }, 'remove');
                    object.x = ghostDrag!.x;
                    object.y = ghostDrag!.y;

                    this.scene.updateGameObjMap({ entityType: entityType, gameObject: object }, 'add');

                    // if there was a platform below before the drag - remove this object from its objectsOnIt set
                    platformsBelowBeforeDrag.forEach((platformBelow: Platform) => {
                        platformBelow.removeObjectOnIt(object);
                    });
                    // if there is a platform below after the drag - add this object to its objectsOnIt set
                    const platformsBelowAfterDrag = this.scene.getPlatformsBelow(object);
                    platformsBelowAfterDrag.forEach((platformBelow: Platform) => {
                        platformBelow.addObjectOnIt(object);
                    });
                    // if it's a platform add objects above it
                    if (entityType === 'platform') {
                        const objectsAbove = this.scene.getObjectsAbove(object);
                        objectsAbove.forEach(objectAbove => {
                            (object as Platform).addObjectOnIt(objectAbove);
                        });
                    }
                }
                ghostDrag!.destroy();
                ghostDrag = null;
                this.scene.selectionController.selectObjects(new Set([object]));
                this.scene.startFlag = tempStartFlag;
                this.scene.endFlag = tempEndFlag;
            }
        );
    }
}
