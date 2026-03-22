/**
 * CommandHistory.ts
 *
 * Manages the undo/redo stacks for the level editor.
 *
 * Usage:
 *   history.executeCommand(new PlaceCommand(...));  // executes and records
 *   history.undo();                                 // Ctrl+Z
 *   history.redo();                                 // Ctrl+Y
 *
 * Executing a new command clears the redo stack — branching history is not
 * supported (linear undo/redo model).
 */

import Command from './Command';

export default class CommandHistory {

    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    /**
     * Executes `cmd` immediately and pushes it onto the undo stack.
     * Clears the redo stack so there is no branching history.
     */
    executeCommand(cmd: Command): void {
        cmd.execute();
        this.undoStack.push(cmd);
        this.redoStack = [];
    }

    /**
     * Undoes the most recent command.
     * The undone command is pushed to the redo stack so it can be replayed.
     * Does nothing when the undo stack is empty.
     */
    undo(): void {
        const cmd = this.undoStack.pop();
        if (!cmd) return;
        cmd.undo();
        this.redoStack.push(cmd);
    }

    /**
     * Replays the most recently undone command.
     * Does nothing when the redo stack is empty.
     */
    redo(): void {
        const cmd = this.redoStack.pop();
        if (!cmd) return;
        cmd.execute();
        this.undoStack.push(cmd);
    }

    /** Returns true when there is at least one command that can be undone. */
    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /** Returns true when there is at least one command that can be redone. */
    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Label of the command that will be undone next, or `null` if the stack
     * is empty.  Useful for rendering "Undo <action>" in a menu.
     */
    get nextUndoLabel(): string | null {
        return this.undoStack.at(-1)?.label ?? null;
    }

    /** Label of the command that will be redone next, or `null`. */
    get nextRedoLabel(): string | null {
        return this.redoStack.at(-1)?.label ?? null;
    }

    /** Discards all history.  Called when a new level is loaded. */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
