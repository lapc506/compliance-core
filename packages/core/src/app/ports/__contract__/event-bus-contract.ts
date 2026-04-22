import { expect, it, vi } from "vitest";
import type { DomainEvent } from "../../../domain/events/index.js";
import { freezeEvent } from "../../../domain/events/index.js";
import type { ISODateTime } from "../../../domain/value-objects/iso-datetime.js";
import type { UUID } from "../../../domain/value-objects/uuid.js";
import type { EventBusPort } from "../event-bus-port.js";

function makeEvent(
  eventType: DomainEvent["eventType"],
  aggregateId: UUID,
  occurredAt: ISODateTime,
): DomainEvent {
  return freezeEvent({
    eventType,
    aggregateId,
    occurredAt,
    payload: {},
  } as DomainEvent);
}

export function runEventBusContract(
  factory: () => EventBusPort,
  ids: { aggregateId: UUID; occurredAt: ISODateTime },
): void {
  it("delivers a published event to a matching subscriber", async () => {
    const bus = factory();
    const handler = vi.fn(async () => undefined);
    bus.subscribe("VerificationStarted", handler);
    await bus.publish(makeEvent("VerificationStarted", ids.aggregateId, ids.occurredAt));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not deliver to subscribers of other types", async () => {
    const bus = factory();
    const handler = vi.fn(async () => undefined);
    bus.subscribe("VerificationFailed", handler);
    await bus.publish(makeEvent("VerificationStarted", ids.aggregateId, ids.occurredAt));
    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribe() stops delivery", async () => {
    const bus = factory();
    const handler = vi.fn(async () => undefined);
    const off = bus.subscribe("VerificationStarted", handler);
    off();
    await bus.publish(makeEvent("VerificationStarted", ids.aggregateId, ids.occurredAt));
    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribe() is idempotent (second call is a no-op)", async () => {
    const bus = factory();
    const off = bus.subscribe("VerificationStarted", vi.fn());
    off();
    expect(() => off()).not.toThrow();
  });

  it("handler exception does not propagate to the publisher", async () => {
    const bus = factory();
    bus.subscribe("VerificationStarted", async () => {
      throw new Error("handler boom");
    });
    await expect(
      bus.publish(makeEvent("VerificationStarted", ids.aggregateId, ids.occurredAt)),
    ).resolves.toBeUndefined();
  });
}
