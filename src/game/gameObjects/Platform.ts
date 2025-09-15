import { TILE_SIZE } from '../config';
export default class Platform extends Phaser.GameObjects.Container {

    topLayer: Phaser.GameObjects.TileSprite;
    fillLayer: Phaser.GameObjects.TileSprite;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        super(scene, x, y);

        this.topLayer = scene.add.tileSprite(0, 0, width, TILE_SIZE, 'platform', 0).setOrigin(0, 0);
        scene.physics.add.existing(this.topLayer, true);

        this.fillLayer = scene.add.tileSprite(0, TILE_SIZE, width, height - TILE_SIZE, 'platform', 1).setOrigin(0, 0);

        scene.physics.add.existing(this.fillLayer, true);

        this.add([this.topLayer, this.fillLayer]);

        const hitArea = new Phaser.Geom.Rectangle(width / 2, height / 2, width, height);
        this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        this.resize(width, height);

        scene.add.existing(this);
    }

    /*
    Resizes the platform to the specified width and height using custom logic so that:
    - if the height is 1 tile, only the top layer is shown
    - if the height is 2 tiles or more, both layers are shown.
    */
    resize(newWidth: number, newHeight: number) {
        this.setSize(newWidth, newHeight);

        this.topLayer.width = newWidth;
        this.fillLayer.width = newWidth;

        // CRUCIAL: Update the hit area size to match the new container size.
        if (this.input?.hitArea) {
            const hitArea = this.input.hitArea as Phaser.Geom.Rectangle;
            hitArea.x = newWidth / 2;
            hitArea.y = newHeight / 2;
            hitArea.width = newWidth;
            hitArea.height = newHeight;
        }

        // height logic
        if (newHeight <= TILE_SIZE) {
            // one tile high - show only the top layer
            this.topLayer.height = TILE_SIZE;
            this.fillLayer.setActive(false).setVisible(false);
            // Explicitly set height to 0 to prevent getBounds() from including its default texture height.
            this.fillLayer.height = 0;
            (this.fillLayer.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        } else {
            // two tiles high or more - show both layers and adjust the fill layer's height
            this.fillLayer.setActive(true).setVisible(true);
            (this.fillLayer.body as Phaser.Physics.Arcade.StaticBody).enable = true;
            this.topLayer.height = TILE_SIZE;
            this.fillLayer.height = newHeight - TILE_SIZE;
        }

    }
}