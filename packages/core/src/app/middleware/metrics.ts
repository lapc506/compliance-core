import type { ClockPort } from "../ports/clock-port.js";
import type { MetricsPort } from "../ports/metrics-port.js";
import type { Middleware } from "./types.js";

/**
 * Metrics middleware — counts command invocations and measures latency.
 *
 * Emits:
 *  - counter `command_total{name,tenant,result}` (result in {ok, error}).
 *  - histogram `command_duration_seconds{name,tenant}`.
 *
 * Labels are intentionally low-cardinality (tenantId cardinality grows
 * with customer count, but stays bounded).
 */

export interface MetricsMiddlewareDeps {
  readonly metrics: MetricsPort;
  readonly clock: ClockPort;
}

export function metrics<I, O>(deps: MetricsMiddlewareDeps): Middleware<I, O> {
  return (next) => async (input, ctx) => {
    const t0 = deps.clock.now().getTime();
    const labels = { name: ctx.commandName, tenant: ctx.principal.tenantId };
    try {
      const out = await next(input, ctx);
      deps.metrics.counter("command_total", { ...labels, result: "ok" }).inc();
      deps.metrics
        .histogram("command_duration_seconds", labels)
        .observe((deps.clock.now().getTime() - t0) / 1000);
      return out;
    } catch (err) {
      deps.metrics.counter("command_total", { ...labels, result: "error" }).inc();
      deps.metrics
        .histogram("command_duration_seconds", labels)
        .observe((deps.clock.now().getTime() - t0) / 1000);
      throw err;
    }
  };
}
