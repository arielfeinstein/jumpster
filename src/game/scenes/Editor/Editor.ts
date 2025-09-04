import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';

/* TODO: Implement entity placement logic
    * - Listen for 'editor-place-entity' events from EditorUI ✓
    * - build function to check if new entity can be placed at the given coordinates (no overlap, within bounds, etc.)
*/


export class Editor extends Scene {

    private platforms: Phaser.Physics.Arcade.StaticGroup;
    private allObjects: Phaser.GameObjects.Group;

    constructor() {
        super('Editor');
    }

    create() {
        this.add.image(400, 600, 'background');

        EventBus.on('editor-place-entity', this.addEntity, this);

        this.platforms = this.physics.add.staticGroup();
        this.allObjects = this.add.group();

        // Close EventBus listener
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('editor-place-entity', this.addEntity, this);
        });

        EventBus.emit('current-scene-ready', this);
    }

    private addEntity({ entityType, x, y }: { entityType: EntityType, x: number, y: number }) {
        // Logic to add the entity to the scene
        console.log('Adding entity:', entityType, 'at', x, y);
        switch (entityType) {
            case 'platform':
                console.log('Adding platform at', x, y);
                this.addPlatform(x, y);
                break;
            case 'enemy':
                // todo
                break;
            case 'coin':
                // todo
                break;
        }
    }

    private addPlatform(x: number, y: number) {
        // this.platforms.create(x, y, 'platform');

        if (this.canPlaceEntity(x, y, 100, 100)) {
            const rect = this.add.rectangle(x, y, 100, 100, 0x000000);
            this.platforms.add(rect);
            this.allObjects.add(rect);
        }

        
    }

    // todo: also account for scene bounds when camera is set up
    private canPlaceEntity(x: number, y: number, objectWidth: number, objectHeight: number): boolean {
        const potentialBounds = new Phaser.Geom.Rectangle(
            x - objectWidth / 2,
            y - objectHeight / 2,
            objectWidth,
            objectHeight
        );

        const objects = this.allObjects.getChildren() as (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image)[];
        for (const obj of objects) {
            const objBounds = obj.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(potentialBounds, objBounds)) {
                return false;
            }
        }

        return true;
    }

}