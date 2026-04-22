import type { DomainEvent } from "../../../domain/events/index.js";
import type { EventBusPort, EventHandler, Unsubscribe } from "../event-bus-port.js";

/**
 * In-memory EventBus. Publishes synchronously invoke handlers (awaited in
 * parallel). Handler exceptions are captured into `deadLetter` and never
 * propagate to the publisher.
 */
export class FakeEventBus implements EventBusPort {
  readonly published: DomainEvent[] = [];
  readonly deadLetter: Array<{ event: DomainEvent; error: unknown }> = [];
  private readonly subscribers = new Map<string, Set<EventHandler>>();

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
    const handlers = this.subscribers.get(event.eventType);
    if (!handlers) return;
    await Promise.all(
      [...handlers].map(async (h) => {
        try {
          await h(event);
        } catch (error) {
          this.deadLetter.push({ event, error });
        }
      }),
    );
  }

  subscribe(eventType: DomainEvent["eventType"], handler: EventHandler): Unsubscribe {
    let set = this.subscribers.get(eventType);
    if (!set) {
      set = new Set();
      this.subscribers.set(eventType, set);
    }
    set.add(handler);
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      set?.delete(handler);
    };
  }
}
