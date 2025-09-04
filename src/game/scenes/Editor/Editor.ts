import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';

/* TODO: Implement entity placement logic
    * - Listen for 'editor-place-entity' events from EditorUI ✓
    * - build function to check if new entity can be placed at the given coordinates (no overlap, within bounds, etc.)
    * - when an entity is in close proximity to a platform make the entity stick to the platform.
*/


export class Editor extends Scene {

    private platforms: Phaser.Physics.Arcade.StaticGroup;
    private allObjects: Phaser.GameObjects.Group;

    private static readonly SNAP_THRESHOLD = 20; // used for deciding whether to snap entities to platforms

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
        const geomRect = new Phaser.Geom.Rectangle(x - 25, y - 25, 50, 50);

        // this.platforms.create(x, y, 'platform');

        if (this.canPlaceEntity(x, y, 50, 50)) {
            const snappedRect = this.getSnapToPlatformCoord(geomRect);

            const rect = this.add.rectangle(snappedRect.centerX, snappedRect.centerY, 50, 50, 0x000000);
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

    private getSnapToPlatformCoord(rect : Readonly<Phaser.Geom.Rectangle>): Phaser.Geom.Rectangle {
            const objAbovePlatform = false;

            const platforms = this.platforms.getChildren() as Phaser.GameObjects.Image[];

            const isXIntersecting = (rect1: Readonly<Phaser.Geom.Rectangle>, rect2: Readonly<Phaser.Geom.Rectangle>) => {
                return Math.abs(rect1.centerX - rect2.centerX) < (rect1.width + rect2.width) / 2;
            };

            const isAbovePlat = (rect1: Readonly<Phaser.Geom.Rectangle>, rect2: Readonly<Phaser.Geom.Rectangle>) => {
                return rect1.bottom <= rect2.top;
            }

            for (const platform of platforms) {
                const platBounds = platform.getBounds();
                console.log('isAbovePlat', isAbovePlat(rect, platBounds));
                console.log('isXIntersecting', isXIntersecting(rect, platBounds));
                if (isAbovePlat(rect, platBounds) && isXIntersecting(rect, platBounds)) {
                    const yDiff = platBounds.top - rect.bottom;
                    console.log('yDiff', yDiff);
                    if (yDiff <= Editor.SNAP_THRESHOLD) {
                        return new Phaser.Geom.Rectangle(
                            rect.x,
                            rect.y + yDiff,
                            rect.width,
                            rect.height
                        );
                    }
                }
                return rect;
            }
            return rect;
    }

}