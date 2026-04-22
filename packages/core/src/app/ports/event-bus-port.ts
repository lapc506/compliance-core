import type { DomainEvent } from "../../domain/events/index.js";

/**
 * EventBusPort — in-process + out-of-process event dispatch.
 *
 * Contracts:
 *  - `publish(event)` MUST be fire-and-forget from the caller's perspective:
 *    resolves once the event is durably enqueued (or synchronously dispatched
 *    to subscribers for in-memory adapter).
 *  - Subscribers MUST NOT mutate the event (already frozen via `freezeEvent`).
 *  - `subscribe(type, handler)` returns an `Unsubscribe` that removes the
 *    handler; calling it more than once is a no-op.
 *  - Handler exceptions MUST NOT propagate to the publisher; adapters log and
 *    route to a dead-letter queue.
 */
export type Unsubscribe = () => void;

export type EventHandler = (event: DomainEvent) => Promise<void>;

export interface EventBusPort {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: DomainEvent["eventType"], handler: EventHandler): Unsubscribe;
}
