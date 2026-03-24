/**
 * ControllerEvents.ts
 *
 * String constants for all intra-editor events emitted via EventEmitter
 * (controller-to-controller communication, NOT the React↔Phaser EventBus).
 *
 * Using a typed const object prevents typo-induced silent failures and makes
 * it easy to grep for every subscriber/emitter of a given event.
 *
 * New events added for the Command Pattern rewrite are marked [NEW].
 */
const ControllerEvents = {
    // -----------------------------------------------------------------------
    // Selection
    // -----------------------------------------------------------------------

    /** Emitted when one or more entities are selected. Payload: Set<GameEntity>, resizeHandlesNeeded: boolean */
    SELECTED_OBJECTS: 'selected-objects',

    /** Emitted when the selection is cleared entirely. */
    DESELECTED_ALL: 'deselected-all',

    /**
     * Emitted when the set of highlighted (hover-selected) objects changes
     * during a box-select drag — used to draw temporary outlines.
     * Payload: Set<GameEntity>
     */
    HIGHLITED_OBJS_UPDATED: 'highlited-objects-updated',

    /** Emitted when a box-select drag ends so the rubber-band can be cleared. */
    SELECTION_DRAG_ENDED: 'select-drag-end',

    // -----------------------------------------------------------------------
    // Drag (place + move unified — new DragController)
    // -----------------------------------------------------------------------

    /** [NEW] Emitted when a drag begins. */
    DRAG_STARTED: 'drag-started',

    /** [NEW] Emitted each frame during a drag with the latest snapped position. */
    DRAG_UPDATED: 'drag-updated',

    /**
     * [NEW] Emitted when a drag ends with a valid final position.
     * Triggers PlaceCommand or MoveCommand depending on mode.
     */
    DRAG_COMMITTED: 'drag-committed',

    /**
     * [NEW] Emitted when a drag is cancelled or ends in an invalid position.
     * For 'place' mode: ghost entity is destroyed.
     * For 'move' mode: entities are restored to their original positions.
     */
    DRAG_CANCELLED: 'drag-cancelled',

    /**
     * [NEW] Emitted when a drag ends, regardless of validity. Used to refresh UI state
     */
    DRAG_ENDED: 'drag-ended',

    // -----------------------------------------------------------------------
    // Platform resize
    // -----------------------------------------------------------------------

    /** Emitted when a resize drag begins. Payload: Platform — entity is temporarily removed from the grid. */
    PLATFORM_RESIZE_STARTED: 'platform-resize-started',

    /** Emitted when a resize drag ends and a ResizeCommand has been committed. Payload: Platform */
    PLATFORM_RESIZE_ENDED: 'platform-resize-ended',

    // -----------------------------------------------------------------------
    // Command history  [NEW]
    // -----------------------------------------------------------------------

    /** [NEW] Emitted after any command is executed, undone, or redone. Used to refresh UI state. */
    HISTORY_CHANGED: 'history-changed',

} as const;

export default ControllerEvents;
