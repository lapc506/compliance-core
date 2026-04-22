import { expect, it } from "vitest";
import { PIIString } from "../../../domain/value-objects/pii-string.js";
import { UUID } from "../../../domain/value-objects/uuid.js";
import type { IdentityVerificationPort } from "../identity-verification-port.js";

export function runIdentityVerificationContract(factory: () => IdentityVerificationPort): void {
  it("startVerification returns a providerSessionId + expiresAt", async () => {
    const port = factory();
    const out = await port.startVerification({
      subjectId: UUID.parse("22222222-2222-4222-8222-222222222222"),
      subjectKind: "IDENTITY",
      fullName: PIIString.from("Ada Lovelace"),
      kind: "KYC_DOCUMENT",
    });
    expect(out.providerSessionId).toBeTruthy();
    expect(out.expiresAt).toMatch(/\dT\d/);
  });

  it("getSessionStatus throws for unknown id", async () => {
    const port = factory();
    await expect(
      port.getSessionStatus(UUID.parse("33333333-3333-4333-8333-333333333333")),
    ).rejects.toBeInstanceOf(Error);
  });

  it("quickCheck returns UNKNOWN signal in v1 stub", async () => {
    const port = factory();
    const r = await port.quickCheck("test@example.com");
    expect(r.signal).toBe("UNKNOWN");
    expect(r.receiverId).toBe("test@example.com");
  });
}
