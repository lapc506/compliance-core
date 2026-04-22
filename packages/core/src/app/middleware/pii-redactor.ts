import { PIIString } from "../../domain/value-objects/pii-string.js";
import type { Middleware } from "./types.js";

/**
 * Returns a deep-cloned copy of `value` in which every `PIIString` has been
 * replaced with the literal `"[REDACTED]"`, and every field whose key is in
 * `forbiddenKeys` (recursively) is also redacted.
 *
 * Unlike `JSON.stringify`, this works for passing values to loggers /
 * tracers / metrics that DO NOT walk through JSON serialization (pino's
 * fast-path accepts pre-transformed objects).
 *
 * NEVER mutates the input; commands receive the raw value back unchanged.
 */

const DEFAULT_FORBIDDEN = new Set([
  "taxId",
  "fullName",
  "documentNumber",
  "dateOfBirth",
  "evidenceBlob",
  "narrative",
  "contactHint",
]);

const REDACTED = "[REDACTED]" as const;

export interface RedactOptions {
  readonly forbiddenKeys?: ReadonlySet<string>;
}

export function redact(value: unknown, options: RedactOptions = {}): unknown {
  const keys = options.forbiddenKeys ?? DEFAULT_FORBIDDEN;
  return walk(value, keys);
}

function walk(value: unknown, keys: ReadonlySet<string>): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof PIIString) return REDACTED;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((v) => walk(v, keys));
  if (typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      out[k] = keys.has(k) ? REDACTED : walk(v, keys);
    }
    return out;
  }
  return value;
}

/**
 * PII-redactor middleware — builds redacted snapshots of input / output and
 * exposes them via the `onLog` callback. Commands still receive / return
 * the raw values.
 */
export interface PIIRedactorDeps {
  readonly onLog?: (event: {
    phase: "enter" | "exit" | "error";
    commandName: string;
    correlationId: string;
    redactedInput?: unknown;
    redactedOutput?: unknown;
    redactedError?: unknown;
  }) => void;
  readonly options?: RedactOptions;
}

export function piiRedactor<I, O>(deps: PIIRedactorDeps = {}): Middleware<I, O> {
  return (next) => async (input, ctx) => {
    const redactedInput = redact(input, deps.options);
    deps.onLog?.({
      phase: "enter",
      commandName: ctx.commandName,
      correlationId: ctx.correlationId,
      redactedInput,
    });
    try {
      const output = await next(input, ctx);
      deps.onLog?.({
        phase: "exit",
        commandName: ctx.commandName,
        correlationId: ctx.correlationId,
        redactedOutput: redact(output, deps.options),
      });
      return output;
    } catch (error) {
      deps.onLog?.({
        phase: "error",
        commandName: ctx.commandName,
        correlationId: ctx.correlationId,
        redactedError: redact(
          error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
          deps.options,
        ),
      });
      throw error;
    }
  };
}
