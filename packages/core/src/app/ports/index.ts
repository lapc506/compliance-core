// Public re-exports for the application port layer.
// Infrastructure ports (Task 17) + domain ports (Task 18).

// Infrastructure
export type { ClockPort } from "./clock-port.js";
export type { LoggerPort } from "./logger-port.js";
export type {
  CounterHandle,
  GaugeHandle,
  HistogramHandle,
  MetricsPort,
} from "./metrics-port.js";
export type { TracingPort, TracingSpan } from "./tracing-port.js";
export type { EventBusPort, EventHandler, Unsubscribe } from "./event-bus-port.js";
export type { IdempotencyPort } from "./idempotency-port.js";
export type { SecretsStorePort } from "./secrets-store-port.js";

// Domain
export type {
  EvidenceBundle,
  IdentityVerificationPort,
  QuickCheckResult,
  StartVerificationInput,
  StartVerificationOutput,
  SubjectKind,
  VerificationKind,
} from "./identity-verification-port.js";
export type {
  MatchResolution,
  RefreshReport,
  SanctionsScreeningPort,
  ScreeningSubject,
} from "./sanctions-screening-port.js";
export type {
  AppendInput,
  AuditLogPort,
  IntegrityReport,
  Period,
} from "./audit-log-port.js";
export type {
  ListMatchesFilter,
  ListSessionsFilter,
  VerificationRepositoryPort,
} from "./verification-repository-port.js";
export {
  makeDisposableCredentials,
  type DisposableCredentials,
  type ProviderCode,
  type ProviderCredentialVault,
  type ProviderCredentialsValue,
} from "./provider-credential-vault.js";
