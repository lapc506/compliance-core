import { describe } from "vitest";
import { runAuditLogContract } from "./__contract__/audit-log-contract.js";
import { runIdentityVerificationContract } from "./__contract__/identity-verification-contract.js";
import { runProviderCredentialVaultContract } from "./__contract__/provider-credential-vault-contract.js";
import { runSanctionsScreeningContract } from "./__contract__/sanctions-screening-contract.js";
import { runVerificationRepositoryContract } from "./__contract__/verification-repository-contract.js";
import { FakeAuditLog } from "./__fakes__/fake-audit-log.js";
import { FakeIdentityVerification } from "./__fakes__/fake-identity-verification.js";
import { FakeProviderCredentialVault } from "./__fakes__/fake-provider-credential-vault.js";
import { FakeSanctionsScreening } from "./__fakes__/fake-sanctions-screening.js";
import { FakeVerificationRepository } from "./__fakes__/fake-verification-repository.js";

describe("IdentityVerificationPort — FakeIdentityVerification contract", () => {
  runIdentityVerificationContract(() => new FakeIdentityVerification());
});

describe("SanctionsScreeningPort — FakeSanctionsScreening contract", () => {
  runSanctionsScreeningContract(() => new FakeSanctionsScreening());
});

describe("AuditLogPort — FakeAuditLog contract", () => {
  runAuditLogContract(() => {
    const port = new FakeAuditLog();
    return { port, corruptHashAt: (seq) => port.corruptHashAt(seq) };
  });
});

describe("VerificationRepositoryPort — FakeVerificationRepository contract", () => {
  runVerificationRepositoryContract(() => new FakeVerificationRepository());
});

describe("ProviderCredentialVault — FakeProviderCredentialVault contract", () => {
  runProviderCredentialVaultContract(() => {
    const vault = new FakeProviderCredentialVault();
    return {
      vault,
      seed: (t, p, v) => vault.seed(t, p, v),
      liveHandleCount: () => vault.liveHandleCount(),
    };
  });
});
