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

/**
 * Type-safe wrapper for subscribing to EventBus events.
 * Infers the payload type from EventBusRegistry so handlers are fully typed.
 * Pass context as the optional third argument to bind `this` inside the handler,
 * matching Phaser's EventEmitter.on() convention.
 */
export function onEvent<T extends EventName>(event: T, handler: (payload: EventBusRegistry[T]) => void, context?: object): void {
    EventBus.on(event, handler, context);
}
