import { ApplicationError } from "../errors.js";
import type { Middleware, Principal, RequestContext } from "./types.js";

/**
 * Auth middleware — verifies the caller is authenticated + authorized and
 * attaches the verified `Principal` to the RequestContext.
 *
 * The middleware is transport-agnostic: callers supply a `verify` function
 * that translates whatever credential the transport produced (JWT, mTLS
 * peer cert, service token) into a `Principal`. If verification fails or
 * the caller lacks a required scope, throws `Unauthorized`.
 */

export class Unauthorized extends ApplicationError {
  constructor(msg = "Unauthorized") {
    super(msg);
  }
}

export class Forbidden extends ApplicationError {
  constructor(msg = "Forbidden") {
    super(msg);
  }
}

export interface AuthCredential {
  readonly kind: "jwt" | "mtls";
  readonly raw: string;
}

export interface AuthMiddlewareDeps<I> {
  readonly verify: (credential: AuthCredential) => Promise<Principal | null>;
  readonly extractCredential: (input: I, ctx: RequestContext) => AuthCredential | undefined;
  readonly requiredScopes?: readonly string[];
}

export function auth<I, O>(deps: AuthMiddlewareDeps<I>): Middleware<I, O> {
  return (next) => async (input, ctx) => {
    const credential = deps.extractCredential(input, ctx);
    if (!credential) throw new Unauthorized("missing credential");
    const principal = await deps.verify(credential);
    if (!principal) throw new Unauthorized("invalid credential");

    if (deps.requiredScopes && deps.requiredScopes.length > 0) {
      const missing = deps.requiredScopes.filter((s) => !principal.scopes.includes(s));
      if (missing.length > 0) {
        throw new Forbidden(`missing scopes: ${missing.join(",")}`);
      }
    }

    const verifiedCtx: RequestContext = {
      correlationId: ctx.correlationId,
      commandName: ctx.commandName,
      principal,
    };
    return next(input, verifiedCtx);
  };
}
