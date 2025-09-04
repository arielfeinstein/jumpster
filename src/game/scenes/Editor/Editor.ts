import { Scene } from 'phaser';
import { EventBus } from '../../EventBus';
import { EntityType } from './EditorUI';

/* TODO: Implement entity placement logic
    * - Listen for 'editor-place-entity' events from EditorUI ✓
    * - build function to check if new entity can be placed at the given coordinates (no overlap, within bounds, etc.)
    * - when an entity is in close proximity to a platform make the entity stick to the platform.
*/


export class Editor extends Scene {

    constructor() {
        super('Editor');
    }

    create() {
        this.add.image(400, 600, 'background');

        
        EventBus.emit('current-scene-ready', this);
    }

    

    

    

    

}