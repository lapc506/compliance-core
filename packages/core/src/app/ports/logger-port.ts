/**
 * LoggerPort — structured logger abstraction.
 *
 * Contracts:
 *  - `info/warn/error` MUST NOT block; implementations buffer asynchronously.
 *  - `ctx` is treated as structured bindings (pino-compatible); callers MUST
 *    pre-redact PII or wrap values in `PIIString` so serializers emit
 *    `[REDACTED]`. The PII redactor middleware enforces this at the boundary.
 *  - `child(bindings)` returns a new logger with merged bindings; parent
 *    bindings are NOT mutated.
 */
export interface LoggerPort {
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerPort;
}
