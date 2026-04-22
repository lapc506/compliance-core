import type { TracingPort, TracingSpan } from "../tracing-port.js";

export interface RecordedSpan {
  readonly name: string;
  readonly attrs: Record<string, unknown>;
  readonly events: Array<{ kind: "attr" | "exception" | "status"; data: unknown }>;
  ended: boolean;
}

export class FakeTracing implements TracingPort {
  readonly spans: RecordedSpan[] = [];

  async startSpan<T>(
    name: string,
    fn: (span: TracingSpan) => Promise<T>,
    attrs: Record<string, unknown> = {},
  ): Promise<T> {
    const record: RecordedSpan = { name, attrs: { ...attrs }, events: [], ended: false };
    const span: TracingSpan = {
      setAttribute(key, value) {
        record.events.push({ kind: "attr", data: { key, value } });
      },
      recordException(err) {
        record.events.push({ kind: "exception", data: err });
      },
      setStatus(status) {
        record.events.push({ kind: "status", data: status });
      },
    };
    this.spans.push(record);
    try {
      const result = await fn(span);
      record.ended = true;
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: "ERROR" });
      record.ended = true;
      throw err;
    }
  }
}
