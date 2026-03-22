import Platform from '../../gameObjects/Platform';
import { cardinalDir, GameObject, RED_TINT, depthConfig } from './Editor';
import { handleResizeConfig } from './SelectionView';
import { TILE_SIZE } from '../../config';
import ControllerEvents from './ControllerEvents';
import GridManager from './GridManager';
import EntityManager from './EntityManager';

type PlatformProperties = { x: number, y: number, width: number, height: number, objectOnTop: Set<Phaser.GameObjects.GameObject> };


export default class PlatformResizeController extends Phaser.Events.EventEmitter {
    /* ---- INIT ---- */
    private scene: Phaser.Scene;

    private platform: Platform | null = null;
    public sizingHandles: Map<cardinalDir, Phaser.GameObjects.Graphics>;

    private currentResizeDir: cardinalDir | null = null;
    private originalPlatformProperties: PlatformProperties | null = null;

    // used in the duration of the resize drag event
    private snappedPointerCoord = new Phaser.Math.Vector2();
    private ghostProps = { showGhost: false, rect: new Phaser.Geom.Rectangle(0, 0, 0, 0) };

    private entityManager: EntityManager;
    private deselectAllObjects: () => void;


    constructor(
        scene: Phaser.Scene,
        entityManager: EntityManager
    ) {
        super();
        this.scene = scene;
        this.entityManager = entityManager;

        this.setupSizingHandles();
    }

    /* ---- SETTERS ---- */

    setPlatform(platform: Platform) {
        this.removeDragListeners();
        this.platform = platform;
        this.addResizeListeners();
    }

    /* ---- CLEAR ---- */

    removeDragListeners() {
        if (!this.sizingHandles) return;

        for (const handle of this.sizingHandles.values()) {
            handle.removeAllListeners('dragstart');
            handle.removeAllListeners('drag');
            handle.removeAllListeners('dragend');
        }
    }

    /* ---- RESIZE LISTENERS AND IMPLEMENTATION ---- */

    addResizeListeners() {
        if (!this.sizingHandles) return;

        for (const [dir, handle] of this.sizingHandles) {
            handle.on('dragstart', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                this.resizeDragStart(pointer, dragX, dragY, dir);
            });
            handle.on('drag', this.resizingDrag, this);
            handle.on('dragend', this.resizeDragEnd, this);
        }
    }

    private resizeDragStart(pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dir: cardinalDir) {
        if (!this.platform) return;

        this.currentResizeDir = dir;
        this.platform!.setAlpha(0.5);

        this.emit('platform-resize-started', this.platform);

        // remove platform from the current platforms below
        this.entityManager.getPlatformsBelow(this.platform!).forEach(platBelow => {
            platBelow.removeObjectOnIt(this.platform!);
        })

        this.originalPlatformProperties = {
            x: this.platform!.x,
            y: this.platform!.y,
            width: this.platform!.width,
            height: this.platform!.height,
            objectOnTop: this.platform!.getObjectsOnIt()
        }
    }

    private resizingDrag(pointer: Phaser.Input.Pointer, dragX: number, dragY: number) {
        if (!this.platform || !this.currentResizeDir || !this.originalPlatformProperties) return;

        // update snapped pointer coordinates
        this.snappedPointerCoord.x = pointer.worldX;
        this.snappedPointerCoord.y = pointer.worldY;
        GridManager.updateToSnappedCoord(this.snappedPointerCoord);

        // update render props
        this.updatePlatRenderProps(this.snappedPointerCoord, this.ghostProps, this.currentResizeDir);

        // update platform ghost
        if (this.ghostProps.showGhost) {
            this.platform.x = this.ghostProps.rect.x;
            this.platform.y = this.ghostProps.rect.y;
            this.platform.resize(this.ghostProps.rect.width, this.ghostProps.rect.height);
            this.platform.setObjectsOnIt(this.entityManager.getObjectsAbove(this.platform));
            this.platform.setVisible(true);
            if (!this.entityManager.canObjectBePlaced(this.platform, 'platform') || this.platform.getObjectsOnIt().size < this.originalPlatformProperties.objectOnTop.size) {
                // cannot be placed - tint red 
                this.platform.setTint(RED_TINT);
            }
            else {
                this.platform.clearTint();
            }
        }
        else {
            this.platform.setVisible(false);
        }
    }

    private resizeDragEnd(pointer: Phaser.Input.Pointer, dragX: number, dragY: number) {
        this.currentResizeDir = null;

        if (!this.platform!.visible || this.platform!.tint === RED_TINT) {
            // resize is illegal - restore to previous properties
            this.platform!.x = this.originalPlatformProperties!.x;
            this.platform!.y = this.originalPlatformProperties!.y;
            this.platform!.resize(this.originalPlatformProperties!.width, this.originalPlatformProperties!.height);
            this.platform!.setObjectsOnIt(this.originalPlatformProperties!.objectOnTop);
        }

        this.platform!.setVisible(true).setAlpha(1).clearTint();

        // add to platforms below the updated platform
        this.entityManager.getPlatformsBelow(this.platform!).forEach((platformBelow) => {
            platformBelow.addObjectOnIt(this.platform!);
        });

        this.emit(ControllerEvents.PLATFORM_RESIZE_ENDED, this.platform);
    }

    /* ---- CLEANUP ---- */
    destroy(): void {
        this.removeDragListeners();
    }

    /* ---- HELPERS ---- */

    /**
       * Updates the rendering properties for a "ghost" platform during a resize operation.
       * This provides visual feedback to the user, showing what the new platform dimensions will be.
       * The calculation depends on an external `dir` variable, which specifies the resize handle's direction (e.g., 'nw', 's', 'e').
       *
       * @param snappedCoord - The current grid-snapped coordinates of the pointer.
       * @param renderProps - The object to update with the ghost platform's rendering properties.
    */
    private updatePlatRenderProps(snappedCoord: Phaser.Math.Vector2, renderProps: { showGhost: boolean, rect: Phaser.Geom.Rectangle }, dir: cardinalDir) {

        if (!this.platform) return;

        const platformLeft = this.platform.x;
        const platformRight = this.platform.x + this.platform.width;
        const platformTop = this.platform.y;
        const platformBottom = this.platform.y + this.platform.height;
        const platformWidth = this.platform.width;
        const platformHeight = this.platform.height;

        renderProps.showGhost = false;

        switch (dir) {
            case 'nw':
                if (snappedCoord.x < platformRight && snappedCoord.y < platformBottom) {
                    renderProps.showGhost = true;
                    renderProps.rect.x = snappedCoord.x;
                    renderProps.rect.y = snappedCoord.y;
                    renderProps.rect.width = platformRight - snappedCoord.x;
                    renderProps.rect.height = platformBottom - snappedCoord.y;
                }
                break;
            case 'n':
                if (snappedCoord.y < platformBottom) {
                    renderProps.showGhost = true;
                    renderProps.rect.x = platformLeft;
                    renderProps.rect.y = snappedCoord.y;
                    renderProps.rect.width = platformWidth;
                    renderProps.rect.height = platformBottom - snappedCoord.y;
                }
                break;
            case 'ne':
                if (snappedCoord.x >= platformLeft && snappedCoord.y < platformBottom) {
                    renderProps.showGhost = true;
                    renderProps.rect.x = platformLeft;
                    renderProps.rect.y = snappedCoord.y;
                    renderProps.rect.width = snappedCoord.x - platformLeft + TILE_SIZE;
                    renderProps.rect.height = platformBottom - snappedCoord.y;
                }
                break;
            case 'w':
                if (snappedCoord.x < platformRight) {
                    renderProps.showGhost = true;
                    renderProps.rect.x = snappedCoord.x;
                    renderProps.rect.y = platformTop;
                    renderProps.rect.width = platformRight - snappedCoord.x;
                    renderProps.rect.height = platformHeight;
                }
                break;
            case 'e':
                if (snappedCoord.x >= platformLeft) {
                    renderProps.showGhost = true;
                    renderProps.rect.x = platformLeft;
                    renderProps.rect.y = platformTop;
                    renderProps.rect.width = snappedCoord.x - platformLeft + TILE_SIZE;
                    renderProps.rect.height = platformHeight;
                }
                break;
            case 'sw':
                if (snappedCoord.x < platformRight && snappedCoord.y >= platformTop) {
                    renderProps.showGhost = true;
                    renderProps.rect.x = snappedCoord.x;
                    renderProps.rect.y = platformTop;
                    renderProps.rect.width = platformRight - snappedCoord.x;
                    renderProps.rect.height = snappedCoord.y - platformTop + TILE_SIZE;
                }
                break;
            case 's':
                if (snappedCoord.y >= platformTop) {
                    renderProps.showGhost = true;
                    renderProps.rect.x = platformLeft;
                    renderProps.rect.y = platformTop;
                    renderProps.rect.width = platformWidth;
                    renderProps.rect.height = snappedCoord.y - platformTop + TILE_SIZE;
                }
                break;
            case 'se':
                if (snappedCoord.x >= platformLeft && snappedCoord.y >= platformTop) {
                    renderProps.showGhost = true;
                    renderProps.rect.x = platformLeft;
                    renderProps.rect.y = platformTop;
                    renderProps.rect.width = snappedCoord.x - platformLeft + TILE_SIZE;
                    renderProps.rect.height = snappedCoord.y - platformTop + TILE_SIZE;
                }
                break;
        }
    }

    private setupSizingHandles() {
        this.sizingHandles = new Map();
        const dirs: cardinalDir[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        dirs.forEach(dir => {
            const handle = this.scene.add.graphics().setDepth(depthConfig.SIZING_HANDLES).setVisible(false);

            handle.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(0, 0, handleResizeConfig.SIZE, handleResizeConfig.SIZE),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                draggable: true
            })

            handle.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
                this.emit(ControllerEvents.PLATFORM_RESIZE_CLICKED);
                event.stopPropagation();
            });

            handle.disableInteractive();

            this.sizingHandles!.set(dir, handle);
        });
    }
}