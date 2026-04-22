import {
  type DisposableCredentials,
  type ProviderCode,
  type ProviderCredentialVault,
  type ProviderCredentialsValue,
  makeDisposableCredentials,
} from "../provider-credential-vault.js";

export class FakeProviderCredentialVault implements ProviderCredentialVault {
  private readonly store = new Map<string, ProviderCredentialsValue>();
  private readonly outstanding = new Set<DisposableCredentials>();

  seed(tenantId: string, provider: ProviderCode, value: Record<string, string>): void {
    this.store.set(`${tenantId}|${provider}`, { ...value });
  }

  liveHandleCount(): number {
    let live = 0;
    for (const d of this.outstanding) {
      if (!d.disposed) live += 1;
    }
    return live;
  }

  async loadCredentials(tenantId: string, provider: ProviderCode): Promise<DisposableCredentials> {
    const value = this.store.get(`${tenantId}|${provider}`);
    if (!value) throw new Error(`no credentials for ${tenantId}/${provider}`);
    const handle = makeDisposableCredentials(value);
    this.outstanding.add(handle);
    return handle;
  }

  async rotate(_tenantId: string, _provider: ProviderCode): Promise<void> {
    // Rotation is a storage-side operation; the fake just relies on `seed`
    // being called with the new value before rotate.
  }
}
