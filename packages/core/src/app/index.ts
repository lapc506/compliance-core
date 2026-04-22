// Public re-exports — consumers import from "@compliance-core/core/app"

export * from "./errors.js";
export * from "./middleware/index.js";
export * from "./ports/index.js";

// Commands
export {
  StartVerification,
  type StartVerificationDeps,
  type StartVerificationInput,
  type StartVerificationOutput,
} from "./commands/start-verification.js";
export {
  CompleteVerification,
  type CompleteVerificationDeps,
  type CompleteVerificationInput,
  type CompleteVerificationOutput,
  type ProviderVerdict,
} from "./commands/complete-verification.js";
export {
  ScreenSanctions,
  type ScreenSanctionsDeps,
  type ScreenSanctionsInput,
  type ScreenSanctionsOutput,
} from "./commands/screen-sanctions.js";
export {
  RefreshSanctionsLists,
  type RefreshSanctionsListsDeps,
  type RefreshSanctionsListsInput,
  type RefreshSanctionsListsOutput,
} from "./commands/refresh-sanctions-lists.js";
export {
  AppendAuditEvent,
  type AppendAuditEventDeps,
  type AppendAuditEventInput,
} from "./commands/append-audit-event.js";

// Queries
export {
  GetVerificationStatus,
  type GetVerificationStatusDeps,
  type GetVerificationStatusInput,
  ListVerifications,
  type ListVerificationsDeps,
  type ListVerificationsInput,
  type ListVerificationsOutput,
} from "./queries/verification-queries.js";
export {
  GetSanctionsMatches,
  type GetSanctionsMatchesDeps,
  type GetSanctionsMatchesInput,
  type GetSanctionsMatchesOutput,
} from "./queries/sanctions-queries.js";
export {
  VerifyAuditIntegrity,
  type VerifyAuditIntegrityDeps,
  type VerifyAuditIntegrityInput,
  ExportAuditLog,
  type ExportAuditLogDeps,
  type ExportAuditLogInput,
} from "./queries/audit-queries.js";
