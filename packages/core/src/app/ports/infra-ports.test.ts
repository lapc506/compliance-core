import { describe } from "vitest";
import { runClockContract } from "./__contract__/clock-contract.js";
import { runEventBusContract } from "./__contract__/event-bus-contract.js";
import { runIdempotencyContract } from "./__contract__/idempotency-contract.js";
import { runLoggerContract } from "./__contract__/logger-contract.js";
import { runMetricsContract } from "./__contract__/metrics-contract.js";
import { runSecretsStoreContract } from "./__contract__/secrets-store-contract.js";
import { runTracingContract } from "./__contract__/tracing-contract.js";
import { FakeClock } from "./__fakes__/fake-clock.js";
import { FakeEventBus } from "./__fakes__/fake-event-bus.js";
import { FakeIdempotency } from "./__fakes__/fake-idempotency.js";
import { FakeLogger } from "./__fakes__/fake-logger.js";
import { FakeMetrics } from "./__fakes__/fake-metrics.js";
import { FakeSecretsStore } from "./__fakes__/fake-secrets-store.js";
import { FakeTracing } from "./__fakes__/fake-tracing.js";

import { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import { UUID } from "../../domain/value-objects/uuid.js";

describe("ClockPort — FakeClock contract", () => {
  runClockContract(() => new FakeClock());
});

describe("LoggerPort — FakeLogger contract", () => {
  runLoggerContract(() => new FakeLogger());
});

describe("MetricsPort — FakeMetrics contract", () => {
  runMetricsContract(() => new FakeMetrics());
});

describe("TracingPort — FakeTracing contract", () => {
  runTracingContract(() => new FakeTracing());
});

describe("EventBusPort — FakeEventBus contract", () => {
  runEventBusContract(() => new FakeEventBus(), {
    aggregateId: UUID.parse("11111111-1111-4111-8111-111111111111"),
    occurredAt: ISODateTime.parse("2026-04-20T12:00:00.000Z"),
  });
});

describe("IdempotencyPort — FakeIdempotency contract", () => {
  runIdempotencyContract(() => new FakeIdempotency());
});

describe("SecretsStorePort — FakeSecretsStore contract", () => {
  runSecretsStoreContract(() => {
    const port = new FakeSecretsStore();
    return { port, set: (path, value) => port.set(path, value) };
  });
});
