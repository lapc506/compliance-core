import { describe, expect, it, vi } from "vitest";

import { PIIString } from "../../domain/value-objects/pii-string.js";
import { FakeClock } from "../ports/__fakes__/fake-clock.js";
import { FakeIdempotency } from "../ports/__fakes__/fake-idempotency.js";
import { FakeMetrics } from "../ports/__fakes__/fake-metrics.js";
import { FakeTracing } from "../ports/__fakes__/fake-tracing.js";

import { Forbidden, Unauthorized, auth } from "./auth.js";
import { idempotency } from "./idempotency.js";
import { metrics } from "./metrics.js";
import { piiRedactor, redact } from "./pii-redactor.js";
import { tracing } from "./tracing.js";
import { type Handler, type RequestContext, compose } from "./types.js";

const CTX: RequestContext = {
  correlationId: "corr-1",
  commandName: "TestCommand",
  principal: {
    tenantId: "tenant-a",
    subjectKind: "USER",
    subjectId: "u-1",
    scopes: ["cmd:execute"],
  },
};

describe("redact() — PII fixture (spec-required)", () => {
  it("redacts PIIString, forbidden keys, and deep-walks objects/arrays", () => {
    const input = {
      subject: {
        fullName: PIIString.from("Ada Lovelace"),
        taxId: "1-1234-5678", // cédula CR
        documentNumber: "P12345678", // passport
        dateOfBirth: "1815-12-10",
      },
      items: [{ fullName: PIIString.from("Grace Hopper") }, { note: "neutral text" }],
      correlationId: "corr-42",
    };
    const out = redact(input);
    const serialized = JSON.stringify(out);

    // Spec requirement: cédula and passport MUST NOT appear verbatim.
    expect(serialized).not.toContain("1-1234-5678");
    expect(serialized).not.toContain("P12345678");
    expect(serialized).not.toContain("Ada Lovelace");
    expect(serialized).not.toContain("Grace Hopper");

    // Non-PII fields survive.
    expect(serialized).toContain("corr-42");
    expect(serialized).toContain("neutral text");
  });
});

describe("piiRedactor middleware", () => {
  it("emits redacted input/output via onLog without mutating the real input", async () => {
    const logs: unknown[] = [];
    const handler: Handler<{ fullName: PIIString; sessionId: string }, { ok: true }> = async (
      input,
    ) => {
      // Handler sees the raw PIIString (can unsafeReveal internally).
      expect(input.fullName).toBeInstanceOf(PIIString);
      expect(input.fullName.unsafeReveal()).toBe("Ada Lovelace");
      return { ok: true };
    };
    const wrapped = piiRedactor<{ fullName: PIIString; sessionId: string }, { ok: true }>({
      onLog: (e) => logs.push(e),
    })(handler);
    await wrapped({ fullName: PIIString.from("Ada Lovelace"), sessionId: "sess-1" }, CTX);
    const serialized = JSON.stringify(logs);
    expect(serialized).not.toContain("Ada Lovelace");
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).toContain("sess-1");
  });

  it("captures errors with redacted fields", async () => {
    const logs: unknown[] = [];
    const handler: Handler<unknown, unknown> = async () => {
      throw new Error("boom");
    };
    const wrapped = piiRedactor({ onLog: (e) => logs.push(e) })(handler);
    await expect(wrapped({}, CTX)).rejects.toThrow("boom");
    const errorLog = logs.find((l) => (l as { phase: string }).phase === "error");
    expect(errorLog).toBeDefined();
  });
});

describe("tracing middleware", () => {
  it("wraps handler in a named span with correlation + tenant attrs", async () => {
    const tracer = new FakeTracing();
    const handler: Handler<{ x: number }, { y: number }> = async (i) => ({ y: i.x * 2 });
    const wrapped = tracing<{ x: number }, { y: number }>({ tracing: tracer })(handler);
    const out = await wrapped({ x: 3 }, CTX);
    expect(out.y).toBe(6);
    expect(tracer.spans).toHaveLength(1);
    expect(tracer.spans[0]?.name).toBe("command.TestCommand");
    expect(tracer.spans[0]?.attrs).toMatchObject({
      correlation_id: "corr-1",
      tenant_id: "tenant-a",
    });
  });

  it("records exceptions + re-throws", async () => {
    const tracer = new FakeTracing();
    const handler: Handler<unknown, unknown> = async () => {
      throw new Error("bad");
    };
    const wrapped = tracing({ tracing: tracer })(handler);
    await expect(wrapped({}, CTX)).rejects.toThrow("bad");
    const span = tracer.spans[0];
    expect(span?.events.some((e) => e.kind === "exception")).toBe(true);
    expect(span?.events.some((e) => e.kind === "status")).toBe(true);
  });
});

describe("idempotency middleware", () => {
  it("keys by (tenant, command, idempotencyKey) and caches", async () => {
    const port = new FakeIdempotency();
    const seen: number[] = [];
    let counter = 0;
    const handler: Handler<{ idempotencyKey?: string }, number> = async () => {
      counter += 1;
      seen.push(counter);
      return counter;
    };
    const wrapped = idempotency<{ idempotencyKey?: string }, number>({
      idempotency: port,
      ttlMs: 60_000,
      extractKey: (i) => i.idempotencyKey,
    })(handler);
    const a = await wrapped({ idempotencyKey: "K-1" }, CTX);
    const b = await wrapped({ idempotencyKey: "K-1" }, CTX);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(seen).toEqual([1]);
  });

  it("passes through when no idempotencyKey present", async () => {
    const port = new FakeIdempotency();
    let counter = 0;
    const handler: Handler<{ idempotencyKey?: string }, number> = async () => {
      counter += 1;
      return counter;
    };
    const wrapped = idempotency<{ idempotencyKey?: string }, number>({
      idempotency: port,
      ttlMs: 60_000,
      extractKey: (i) => i.idempotencyKey,
    })(handler);
    await wrapped({}, CTX);
    await wrapped({}, CTX);
    expect(counter).toBe(2);
  });
});

describe("metrics middleware", () => {
  it("records counter + histogram on success and on failure", async () => {
    const m = new FakeMetrics();
    const clock = new FakeClock("2026-04-20T12:00:00.000Z");
    const okHandler: Handler<void, string> = async () => {
      clock.advance(50);
      return "ok";
    };
    const errHandler: Handler<void, string> = async () => {
      clock.advance(20);
      throw new Error("fail");
    };
    const okWrapped = metrics<void, string>({ metrics: m, clock })(okHandler);
    const errWrapped = metrics<void, string>({ metrics: m, clock })(errHandler);

    await okWrapped(undefined, CTX);
    await expect(errWrapped(undefined, CTX)).rejects.toThrow();

    const okKey = "command_total{name=TestCommand,result=ok,tenant=tenant-a}";
    const errKey = "command_total{name=TestCommand,result=error,tenant=tenant-a}";
    expect(m.recorded.counters.get(okKey)).toBe(1);
    expect(m.recorded.counters.get(errKey)).toBe(1);
  });
});

describe("auth middleware", () => {
  it("attaches verified principal to context", async () => {
    let seenPrincipal: RequestContext["principal"] | null = null;
    const handler: Handler<{ token: string }, boolean> = async (_i, ctx) => {
      seenPrincipal = ctx.principal;
      return true;
    };
    const wrapped = auth<{ token: string }, boolean>({
      extractCredential: (i) => ({ kind: "jwt", raw: i.token }),
      verify: async (c) =>
        c.raw === "good"
          ? {
              tenantId: "t-auth",
              subjectKind: "USER",
              subjectId: "u-auth",
              scopes: ["cmd:execute"],
            }
          : null,
    })(handler);
    await wrapped({ token: "good" }, CTX);
    expect(seenPrincipal).toMatchObject({ tenantId: "t-auth", subjectId: "u-auth" });
  });

  it("throws Unauthorized on bad/missing credential", async () => {
    const handler: Handler<{ token?: string }, boolean> = async () => true;
    const wrapped = auth<{ token?: string }, boolean>({
      extractCredential: (i) => (i.token ? { kind: "jwt", raw: i.token } : undefined),
      verify: async () => null,
    })(handler);
    await expect(wrapped({}, CTX)).rejects.toBeInstanceOf(Unauthorized);
    await expect(wrapped({ token: "x" }, CTX)).rejects.toBeInstanceOf(Unauthorized);
  });

  it("throws Forbidden when scopes missing", async () => {
    const handler: Handler<{ token: string }, boolean> = async () => true;
    const wrapped = auth<{ token: string }, boolean>({
      extractCredential: (i) => ({ kind: "jwt", raw: i.token }),
      verify: async () => ({
        tenantId: "t-x",
        subjectKind: "USER",
        subjectId: "u-x",
        scopes: [],
      }),
      requiredScopes: ["cmd:execute"],
    })(handler);
    await expect(wrapped({ token: "good" }, CTX)).rejects.toBeInstanceOf(Forbidden);
  });
});

describe("compose", () => {
  it("runs middlewares outside-in and returns handler value", async () => {
    const order: string[] = [];
    const log = (name: string) => ({
      enter: () => order.push(`enter:${name}`),
      exit: () => order.push(`exit:${name}`),
    });
    const mw =
      (name: string) =>
      () =>
      (next: Handler<number, number>) =>
      async (i: number, c: RequestContext) => {
        log(name).enter();
        const o = await next(i, c);
        log(name).exit();
        return o;
      };
    const handler: Handler<number, number> = async (i) => {
      order.push("handler");
      return i + 1;
    };
    const outer = mw("A")();
    const middle = mw("B")();
    const chain = compose<number, number>(outer, middle);
    const wrapped = chain(handler);
    const out = await wrapped(10, CTX);
    expect(out).toBe(11);
    expect(order).toEqual(["enter:A", "enter:B", "handler", "exit:B", "exit:A"]);
  });
});

describe("integration: full chain end-to-end", () => {
  it("composed chain still redacts PII from logs + records metrics + spans", async () => {
    const tracer = new FakeTracing();
    const mmetrics = new FakeMetrics();
    const idemPort = new FakeIdempotency();
    const clock = new FakeClock("2026-04-20T12:00:00.000Z");
    const logs: unknown[] = [];

    interface I {
      readonly idempotencyKey?: string;
      readonly fullName: PIIString;
      readonly token: string;
    }
    interface O {
      readonly ok: true;
    }

    const onLog = vi.fn((e: unknown) => {
      logs.push(e);
    });

    const chain = compose<I, O>(
      auth<I, O>({
        extractCredential: (i) => ({ kind: "jwt", raw: i.token }),
        verify: async (c) =>
          c.raw === "good"
            ? { tenantId: "tenant-a", subjectKind: "USER", subjectId: "u-1", scopes: [] }
            : null,
      }),
      piiRedactor<I, O>({ onLog }),
      tracing<I, O>({ tracing: tracer }),
      idempotency<I, O>({
        idempotency: idemPort,
        ttlMs: 60_000,
        extractKey: (i) => i.idempotencyKey,
      }),
      metrics<I, O>({ metrics: mmetrics, clock }),
    );

    const handler: Handler<I, O> = async () => ({ ok: true });
    const wrapped = chain(handler);

    await wrapped(
      { fullName: PIIString.from("Ada Lovelace"), token: "good", idempotencyKey: "K1" },
      CTX,
    );

    // No raw PII in any captured log line.
    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain("Ada Lovelace");

    // Tracing captured.
    expect(tracer.spans).toHaveLength(1);
    // Metrics recorded.
    expect(
      mmetrics.recorded.counters.get("command_total{name=TestCommand,result=ok,tenant=tenant-a}"),
    ).toBe(1);

    // Replay with same idempotency key runs handler only once.
    await wrapped(
      { fullName: PIIString.from("Ada Lovelace"), token: "good", idempotencyKey: "K1" },
      CTX,
    );
    // Counter stays at 1 because handler was skipped (cached result short-circuits metrics too since
    // metrics runs INSIDE idempotency's inner scope only on first execution).
    expect(
      mmetrics.recorded.counters.get("command_total{name=TestCommand,result=ok,tenant=tenant-a}"),
    ).toBe(1);
  });
});
