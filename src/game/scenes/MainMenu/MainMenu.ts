import { Scene } from 'phaser';

import { EventBus } from '../../EventBus';
import { LevelData } from '../../shared/types/LevelData';
import { Difficulty } from '../../shared/types/Difficulty';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Fill the visible canvas with the background
        const vw = this.scale.width;
        const vh = this.scale.height;
        this.add
            .image(0, 0, 'background')
            .setOrigin(0, 0)
            .setDisplaySize(vw, vh)
            .setScrollFactor(0)
            .setDepth(-10);

        
        const editLevelHandler = ({ levelId, levelData, difficulty }: { levelId?: string; levelData?: LevelData; difficulty?: Difficulty }) => {
            this.scene.start('Editor', { levelId: levelId ?? null, levelData, difficulty });
        };

        EventBus.on('main-menu-edit-level', editLevelHandler, this);

        const playLevelHandler = ({ levelId, levelData }: { levelId: string; levelData: LevelData }) => {
            this.scene.start('Play', { levelId, levelData });
        };

        EventBus.on('main-menu-play-level', playLevelHandler, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('main-menu-edit-level', editLevelHandler, this);
            EventBus.off('main-menu-play-level', playLevelHandler, this);
        });

        EventBus.emit('current-scene-ready', this);
    }
}
