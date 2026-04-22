/**
 * ProviderCredentialVault — abstraction for API keys / OAuth tokens for
 * KYC/AML providers. Implementations: Vault, AWS KMS, GCP KMS, sealed-secrets.
 *
 * SECURITY:
 *  - Credentials are returned wrapped in a `DisposableCredentials` handle so
 *    callers can zero the buffer at the end of the request scope.
 *  - Holding credentials past request scope is a security violation; the
 *    Disposable pattern + `[Symbol.dispose]` gives the runtime a chance to
 *    clear memory (using `using` declarations, TS 5.2+).
 *  - `rotate()` is called by the ops cron; new calls to `loadCredentials()`
 *    after rotation MUST return the new value.
 */

export type ProviderCode = "PERSONA" | "ONDATO" | "INCODE" | "SNAP" | "WORLD_ID";

export interface ProviderCredentialsValue {
  readonly apiKey?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly bearer?: string;
  readonly mtlsCertPem?: string;
  readonly mtlsKeyPem?: string;
}

/**
 * Disposable wrapper. Tests assert credentials are not held past scope by
 * introspecting the `disposed` flag.
 */
export interface DisposableCredentials extends Disposable {
  readonly disposed: boolean;
  reveal(): ProviderCredentialsValue;
}

export interface ProviderCredentialVault {
  loadCredentials(tenantId: string, provider: ProviderCode): Promise<DisposableCredentials>;
  rotate(tenantId: string, provider: ProviderCode): Promise<void>;
}

/**
 * Helper: build a DisposableCredentials that zeros (best-effort) its backing
 * record on dispose. Adapters can use this directly; tests can inspect it.
 */
export function makeDisposableCredentials(value: ProviderCredentialsValue): DisposableCredentials {
  let data: Record<string, string | undefined> | null = { ...value };
  let isDisposed = false;

  return {
    get disposed(): boolean {
      return isDisposed;
    },
    reveal(): ProviderCredentialsValue {
      if (isDisposed || data === null) {
        throw new Error("DisposableCredentials has been disposed");
      }
      return { ...data };
    },
    [Symbol.dispose](): void {
      if (isDisposed) return;
      isDisposed = true;
      if (data !== null) {
        for (const k of Object.keys(data)) data[k] = undefined;
        data = null;
      }
    },
  };
}
