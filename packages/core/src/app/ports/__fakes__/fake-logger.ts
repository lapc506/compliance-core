import type { LoggerPort } from "../logger-port.js";

export interface LoggedLine {
  readonly level: "info" | "warn" | "error";
  readonly msg: string;
  readonly ctx: Record<string, unknown>;
}

/**
 * FakeLogger — captures emitted lines in-memory.
 * `bindings` are merged into every line's ctx (pino-compatible semantics).
 */
export class FakeLogger implements LoggerPort {
  readonly lines: LoggedLine[] = [];
  private readonly bindings: Record<string, unknown>;

  constructor(bindings: Record<string, unknown> = {}, sink?: LoggedLine[]) {
    this.bindings = { ...bindings };
    if (sink) this.lines = sink;
  }

  info(msg: string, ctx?: Record<string, unknown>): void {
    this.lines.push({ level: "info", msg, ctx: { ...this.bindings, ...(ctx ?? {}) } });
  }
  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.lines.push({ level: "warn", msg, ctx: { ...this.bindings, ...(ctx ?? {}) } });
  }
  error(msg: string, ctx?: Record<string, unknown>): void {
    this.lines.push({ level: "error", msg, ctx: { ...this.bindings, ...(ctx ?? {}) } });
  }
  child(bindings: Record<string, unknown>): LoggerPort {
    // Shared sink so tests can inspect the whole stream from the root.
    return new FakeLogger({ ...this.bindings, ...bindings }, this.lines);
  }
}
