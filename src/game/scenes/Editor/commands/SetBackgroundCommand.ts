/**
 * SetBackgroundCommand.ts
 *
 * Reversible command for changing the editor's background tile.
 * Stores only the previous and next frame indices (plain data) and
 * delegates the visual swap to BackgroundManager.
 */

import Command from './Command';
import BackgroundManager from '../managers/BackgroundManager';
import { BackgroundKey } from '../../../shared/types/BackgroundKey';

export default class SetBackgroundCommand extends Command {

    private readonly previousKey: BackgroundKey;
    private readonly nextKey: BackgroundKey;
    private readonly backgroundManager: BackgroundManager;

    constructor(
        backgroundManager: BackgroundManager,
        previousKey: BackgroundKey,
        nextKey: BackgroundKey,
    ) {
        super();
        this.backgroundManager = backgroundManager;
        this.previousKey = previousKey;
        this.nextKey = nextKey;
    }

    get label(): string {
        return 'Change background';
    }

    execute(): void {
        this.backgroundManager.setBackground(this.nextKey);
    }

    undo(): void {
        this.backgroundManager.setBackground(this.previousKey);
    }
}
