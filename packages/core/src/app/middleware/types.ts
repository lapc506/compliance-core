/**
 * Generic middleware types for the compliance-core application layer.
 *
 * A `Handler<I, O>` is a single function that executes a command / query.
 * A `Middleware<I, O>` wraps a handler to add cross-cutting concerns
 * (PII redaction, tracing, idempotency, metrics, auth).
 *
 * Middlewares compose via `compose(...)` — first argument is the outermost
 * (runs first on the way in, last on the way out).
 */

export interface Principal {
  readonly tenantId: string;
  readonly subjectKind: "USER" | "SERVICE" | "SYSTEM";
  readonly subjectId: string;
  readonly scopes: readonly string[];
}

export interface RequestContext {
  readonly correlationId: string;
  readonly principal: Principal;
  readonly commandName: string;
}

export type Handler<I, O> = (input: I, ctx: RequestContext) => Promise<O>;

export type Middleware<I, O> = (next: Handler<I, O>) => Handler<I, O>;

/**
 * Compose middlewares left-to-right: the first element of the array wraps
 * the handler last (i.e. it runs outermost). This matches Koa/Express
 * conventions.
 */
export function compose<I, O>(...middlewares: ReadonlyArray<Middleware<I, O>>): Middleware<I, O> {
  return (handler) => {
    let wrapped = handler;
    for (let i = middlewares.length - 1; i >= 0; i -= 1) {
      const mw = middlewares[i];
      if (mw === undefined) continue;
      wrapped = mw(wrapped);
    }
    return wrapped;
  };
}
