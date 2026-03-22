/**
 * Command.ts
 *
 * Abstract base for all reversible editor actions.
 *
 * Each concrete command captures enough state in its constructor to fully
 * execute and undo the action without external side-effects.  Commands must
 * NOT hold live scene references beyond what is strictly necessary; prefer
 * storing snapshots (plain data) so undo works even after objects are destroyed.
 */
export default abstract class Command {

    /**
     * Applies the action.  Called immediately on creation and again on redo.
     * Must be idempotent when called after a matching `undo()`.
     */
    abstract execute(): void;

    /**
     * Reverses the action.  Called when the user presses Ctrl+Z.
     * Must leave the editor in the state it was in before `execute()`.
     */
    abstract undo(): void;

    /**
     * Short human-readable description shown in debug overlays or future
     * history panels.  Example: "Place enemy at (64, 128)".
     */
    abstract get label(): string;
}
