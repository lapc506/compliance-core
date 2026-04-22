/**
 * TracingPort — OpenTelemetry-compatible span abstraction.
 *
 * Contracts:
 *  - `startSpan(name, fn, attrs)` MUST end the span in both success and
 *    failure paths. Failures MUST be recorded with `span.recordException` and
 *    the span status set to ERROR before re-throwing.
 *  - Attribute values MUST be pre-redacted — middleware strips PIIString.
 */

export interface TracingSpan {
  setAttribute(key: string, value: string | number | boolean): void;
  recordException(error: unknown): void;
  setStatus(status: { code: "OK" | "ERROR"; message?: string }): void;
}

export interface TracingPort {
  startSpan<T>(
    name: string,
    fn: (span: TracingSpan) => Promise<T>,
    attrs?: Record<string, unknown>,
  ): Promise<T>;
}
