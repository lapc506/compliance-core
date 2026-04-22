import type { TracingPort } from "../ports/tracing-port.js";
import { redact } from "./pii-redactor.js";
import type { Middleware } from "./types.js";

/**
 * Tracing middleware. Wraps the handler in `startSpan` with
 * `correlation_id`, `tenant_id`, `command_name` attributes. On failure,
 * records the exception with a redacted `message` (errors MAY embed PII if
 * an exception bubbles up from domain; pre-redact as a safety net).
 */
export interface TracingMiddlewareDeps {
  readonly tracing: TracingPort;
}

export function tracing<I, O>(deps: TracingMiddlewareDeps): Middleware<I, O> {
  return (next) => (input, ctx) =>
    deps.tracing.startSpan(
      `command.${ctx.commandName}`,
      async (span) => {
        try {
          return await next(input, ctx);
        } catch (error) {
          const redactedMessage =
            error instanceof Error
              ? (redact({ message: error.message }) as { message: string }).message
              : "error";
          span.recordException({ name: "CommandError", message: redactedMessage });
          span.setStatus({ code: "ERROR", message: redactedMessage });
          throw error;
        }
      },
      {
        correlation_id: ctx.correlationId,
        tenant_id: ctx.principal.tenantId,
        command_name: ctx.commandName,
      },
    );
}
