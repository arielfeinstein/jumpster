const ControllerEvents = {
    SELECTED_OBJECTS: 'selected-objects',
    DESELECTED_ALL: 'deselected-all',
    SELECTION_BOX_UPDATED: 'selection-box-updated',
    SELECTION_DRAG_ENDED: 'select-drag-end',
    OBJECT_DRAG_STARTED: 'object-drag-started',
    OBJECT_DRAG_ENDED: 'object-drag-ended',
    PLATFORM_RESIZE_CLICKED: 'platform-resize-clicked',
    PLATFORM_RESIZE_STARTED: 'platform-resize-started',
    PLATFORM_RESIZE_ENDED: 'platform-resize-ended',

} as const;

export default ControllerEvents;