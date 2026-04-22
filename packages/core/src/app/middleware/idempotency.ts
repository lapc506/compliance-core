import type { IdempotencyPort } from "../ports/idempotency-port.js";
import type { Middleware } from "./types.js";

/**
 * Idempotency middleware. Keys by `(tenantId, commandName, idempotencyKey)`.
 * Callers must supply an `idempotencyKey` field on the input (or request
 * scope) for this middleware to activate — when absent, the middleware is a
 * pass-through. TTL is configurable per-chain.
 */

export interface IdempotencyMiddlewareDeps {
  readonly idempotency: IdempotencyPort;
  readonly ttlMs: number;
  readonly extractKey: (input: unknown) => string | undefined;
}

export function idempotency<I, O>(deps: IdempotencyMiddlewareDeps): Middleware<I, O> {
  return (next) => async (input, ctx) => {
    const idemKey = deps.extractKey(input);
    if (!idemKey) return next(input, ctx);
    const fullKey = `${ctx.principal.tenantId}:${ctx.commandName}:${idemKey}`;
    return deps.idempotency.run(fullKey, deps.ttlMs, () => next(input, ctx));
  };
}
