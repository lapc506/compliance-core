import { expect, it } from "vitest";
import type { ProviderCode, ProviderCredentialVault } from "../provider-credential-vault.js";

export interface VaultContractHarness {
  vault: ProviderCredentialVault;
  /** Store a credential set for (tenant, provider). */
  seed(tenantId: string, provider: ProviderCode, value: Record<string, string>): void;
  /** Count active (non-disposed) credential handles outstanding. */
  liveHandleCount(): number;
}

export function runProviderCredentialVaultContract(factory: () => VaultContractHarness): void {
  it("loadCredentials returns a handle that reveals the seeded value", async () => {
    const h = factory();
    h.seed("tenant-1", "PERSONA", { apiKey: "P-123" });
    const disposable = await h.vault.loadCredentials("tenant-1", "PERSONA");
    try {
      expect(disposable.reveal().apiKey).toBe("P-123");
    } finally {
      disposable[Symbol.dispose]();
    }
  });

  it("disposed handle throws on reveal()", async () => {
    const h = factory();
    h.seed("tenant-1", "PERSONA", { apiKey: "P-123" });
    const disposable = await h.vault.loadCredentials("tenant-1", "PERSONA");
    disposable[Symbol.dispose]();
    expect(() => disposable.reveal()).toThrow();
    expect(disposable.disposed).toBe(true);
  });

  it("credentials are not held past request scope (using-style)", async () => {
    const h = factory();
    h.seed("tenant-1", "PERSONA", { apiKey: "P-123" });
    async function scoped(): Promise<void> {
      const d = await h.vault.loadCredentials("tenant-1", "PERSONA");
      d.reveal();
      d[Symbol.dispose]();
    }
    await scoped();
    // After the scope, no live handles remain.
    expect(h.liveHandleCount()).toBe(0);
  });

  it("rotate() causes subsequent loadCredentials to see new value", async () => {
    const h = factory();
    h.seed("tenant-1", "PERSONA", { apiKey: "V1" });
    const d1 = await h.vault.loadCredentials("tenant-1", "PERSONA");
    expect(d1.reveal().apiKey).toBe("V1");
    d1[Symbol.dispose]();

    h.seed("tenant-1", "PERSONA", { apiKey: "V2" });
    await h.vault.rotate("tenant-1", "PERSONA");

    const d2 = await h.vault.loadCredentials("tenant-1", "PERSONA");
    expect(d2.reveal().apiKey).toBe("V2");
    d2[Symbol.dispose]();
  });
}
