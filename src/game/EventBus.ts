import { Events } from 'phaser';
import { EventBusRegistry, EventName } from './shared/registry/EventRegistry';

// Used to emit events between components, HTML and Phaser scenes
export const EventBus = new Events.EventEmitter();

/**
 * Type-safe wrapper for emitting events on the EventBus.
 * Enforces that the payload matches the contract defined in EventBusRegistry.
 */
export function emitEvent<T extends EventName>(event: T, payload: EventBusRegistry[T]): void {
    EventBus.emit(event, payload);
}
