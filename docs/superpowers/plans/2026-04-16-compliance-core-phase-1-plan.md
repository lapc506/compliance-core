# compliance-core Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build compliance-core v0.1 MVP — TypeScript hexagonal library exposing gRPC for KYC identity verification (Persona primary, Ondato secondary), OFAC sanctions screening, SHA-256 chained audit log, and PostgreSQL-backed verification repository, with dual deployment and full observability.

**Architecture:** Hexagonal (Explicit Architecture). Primary adapters: gRPC (:50071) + REST (:8767 standalone). Application layer with 12 ports. Pure domain with Identity/VerificationSession/SanctionsMatch entities. Secondary adapters: Persona SDK, Ondato stub, OFAC SDN XML feed, PostgreSQL, Vault, OTel.

**Tech Stack:** TypeScript 5.x strict · Node 22 LTS · pnpm · Vitest · gRPC · PostgreSQL 16 · Redis 7 · Drizzle ORM · Fastify · OpenTelemetry SDK · pino · zod · Persona SDK · fast-xml-parser (OFAC feed).

---

## Source spec

`/home/kvttvrsis/Documentos/GitHub/compliance-core/docs/superpowers/specs/2026-04-16-compliance-core-design.md` — sections §§3-6, §10-12, §14 govern Fase 1.

**Non-goals for Fase 1** (deferred to Fases 2-5): PEP screening, adverse media, KYB full, AML transaction monitoring, PoP, whistleblower channel, Snap Compliance adapter, Incode adapter (fallback), Travel Rule.

---

## File Structure (Fase 1)

Every file created or modified in Fase 1. Paths relative to repo root `/home/kvttvrsis/Documentos/GitHub/compliance-core/`.

### Root tooling

- `package.json` — pnpm workspace root, scripts (`build`, `test`, `lint`, `proto:gen`).
- `pnpm-workspace.yaml` — declares `packages/*`.
- `tsconfig.base.json` — strict TS config inherited by every package.
- `biome.json` — linter + formatter config.
- `vitest.config.ts` — root test config with coverage thresholds.
- `.gitignore` — node_modules, dist, coverage, .env.
- `.env.example` — documented env vars (no secrets).
- `.nvmrc` — `22.11.0`.
- `.github/workflows/ci.yml` — CI matrix (lint, test, proto, build, docker).
- `LICENSE.md` — already exists (BSL 1.1).
- `README.md` — already exists (update with getting-started after scaffold).

### Proto

- `proto/compliance/v1/common.proto` — shared types (`UUID`, `ISODateTime`, `Jurisdiction`, `PIIString`).
- `proto/compliance/v1/admin.proto` — `ComplianceAdmin` service.
- `proto/compliance/v1/screening.proto` — `ComplianceScreening` service.
- `proto/compliance/v1/aml.proto` — `ComplianceAML` service (stub in Fase 1).
- `proto/compliance/v1/audit.proto` — `ComplianceAudit` service.
- `proto/compliance/v1/whistle.proto` — `ComplianceWhistle` service (stub).
- `proto/compliance/v1/health.proto` — `ComplianceHealth` service.
- `proto/buf.yaml`, `proto/buf.gen.yaml` — buf config for codegen.
- `packages/proto/src/generated/**` — TS output from `buf generate`.
- `packages/proto/package.json`, `tsconfig.json`.

### Domain layer (`packages/core`)

- `packages/core/src/domain/value-objects/uuid.ts`
- `packages/core/src/domain/value-objects/tax-id.ts`
- `packages/core/src/domain/value-objects/document-ref.ts`
- `packages/core/src/domain/value-objects/jurisdiction.ts`
- `packages/core/src/domain/value-objects/hex32.ts`
- `packages/core/src/domain/value-objects/iso-datetime.ts`
- `packages/core/src/domain/value-objects/decimal.ts`
- `packages/core/src/domain/entities/identity.ts`
- `packages/core/src/domain/entities/business-entity.ts`
- `packages/core/src/domain/entities/verification-session.ts`
- `packages/core/src/domain/entities/sanctions-match.ts`
- `packages/core/src/domain/entities/compliance-event.ts`
- `packages/core/src/domain/entities/audit-entry.ts`
- `packages/core/src/domain/entities/provider-account.ts`
- `packages/core/src/domain/events/verification-started.ts`
- `packages/core/src/domain/events/verification-completed.ts`
- `packages/core/src/domain/events/verification-failed.ts`
- `packages/core/src/domain/events/sanctions-match-found.ts`
- `packages/core/src/domain/events/audit-integrity-broken.ts`
- `packages/core/src/domain/events/list-refreshed.ts`
- `packages/core/src/domain/errors.ts` — typed errors (InvalidVerificationStateTransition, etc.).
- `packages/core/src/domain/services/audit-chain-service.ts`
- `packages/core/src/domain/services/match-normalizer.ts` — Jaro-Winkler + Double Metaphone.
- `packages/core/src/domain/services/state-machine.ts` — VerificationSession transitions.
- `packages/core/src/domain/index.ts` — public re-exports.

### Application layer

- `packages/core/src/app/ports/identity-verification-port.ts`
- `packages/core/src/app/ports/sanctions-screening-port.ts`
- `packages/core/src/app/ports/audit-log-port.ts`
- `packages/core/src/app/ports/verification-repository-port.ts`
- `packages/core/src/app/ports/provider-credential-vault-port.ts`
- `packages/core/src/app/ports/clock-port.ts`
- `packages/core/src/app/ports/logger-port.ts`
- `packages/core/src/app/ports/metrics-port.ts`
- `packages/core/src/app/ports/event-bus-port.ts`
- `packages/core/src/app/ports/tracing-port.ts`
- `packages/core/src/app/ports/idempotency-port.ts`
- `packages/core/src/app/ports/secrets-store-port.ts`
- `packages/core/src/app/commands/start-verification.ts`
- `packages/core/src/app/commands/complete-verification.ts`
- `packages/core/src/app/commands/screen-sanctions.ts`
- `packages/core/src/app/commands/refresh-sanctions-lists.ts`
- `packages/core/src/app/commands/append-audit-event.ts`
- `packages/core/src/app/queries/get-verification-status.ts`
- `packages/core/src/app/queries/list-verifications.ts`
- `packages/core/src/app/queries/get-sanctions-matches.ts`
- `packages/core/src/app/queries/verify-audit-integrity.ts`
- `packages/core/src/app/queries/export-audit-log.ts`
- `packages/core/src/app/middleware/pii-redactor.ts`
- `packages/core/src/app/middleware/tracing.ts`
- `packages/core/src/app/middleware/idempotency.ts`
- `packages/core/src/app/middleware/auth.ts`
- `packages/core/src/app/middleware/metrics.ts`
- `packages/core/src/app/index.ts`

### Adapters (secondary)

- `packages/adapter-persona/src/index.ts`
- `packages/adapter-persona/src/persona-client.ts`
- `packages/adapter-persona/src/persona-adapter.ts`
- `packages/adapter-persona/src/webhook-verifier.ts`
- `packages/adapter-persona/src/dto.ts`
- `packages/adapter-ondato/src/ondato-adapter.ts` — skeleton with age endpoint.
- `packages/adapter-ondato/src/ondato-client.ts`
- `packages/adapter-ondato/src/dto.ts`
- `packages/adapter-ofac/src/ofac-adapter.ts`
- `packages/adapter-ofac/src/xml-parser.ts`
- `packages/adapter-ofac/src/matcher.ts`
- `packages/adapter-ofac/src/normalizer.ts`
- `packages/adapter-ofac/src/fixtures/sdn-sample.xml` — trimmed real OFAC sample.
- `packages/adapter-postgres/src/schema/identities.ts` — Drizzle schema.
- `packages/adapter-postgres/src/schema/verifications.ts`
- `packages/adapter-postgres/src/schema/sanctions-matches.ts`
- `packages/adapter-postgres/src/schema/sanctions-list-entries.ts`
- `packages/adapter-postgres/src/schema/audit-log.ts`
- `packages/adapter-postgres/src/schema/idempotency.ts`
- `packages/adapter-postgres/src/schema/index.ts`
- `packages/adapter-postgres/src/repositories/verification-repository.ts`
- `packages/adapter-postgres/src/repositories/sanctions-repository.ts`
- `packages/adapter-postgres/src/repositories/audit-log-repository.ts`
- `packages/adapter-postgres/src/migrations/0001_init.sql` — generated by drizzle-kit.
- `packages/adapter-postgres/drizzle.config.ts`
- `packages/adapter-vault/src/vault-credential-vault.ts`
- `packages/adapter-vault/src/sealed-secrets-loader.ts`
- `packages/adapter-otel/src/tracer.ts`
- `packages/adapter-otel/src/metrics.ts`
- `packages/adapter-otel/src/logger.ts` — pino with redaction.

### Primary adapters (transport)

- `packages/server/src/grpc/server.ts`
- `packages/server/src/grpc/interceptors/tracing.ts`
- `packages/server/src/grpc/interceptors/auth.ts`
- `packages/server/src/grpc/interceptors/redaction.ts`
- `packages/server/src/grpc/services/admin.ts`
- `packages/server/src/grpc/services/screening.ts`
- `packages/server/src/grpc/services/aml.ts` — stub with UNIMPLEMENTED.
- `packages/server/src/grpc/services/audit.ts`
- `packages/server/src/grpc/services/whistle.ts` — stub with UNIMPLEMENTED.
- `packages/server/src/grpc/services/health.ts`
- `packages/server/src/rest/fastify-app.ts`
- `packages/server/src/rest/routes/admin.ts`
- `packages/server/src/rest/routes/screening.ts`
- `packages/server/src/rest/routes/webhook-persona.ts`
- `packages/server/src/rest/routes/health.ts`
- `packages/server/src/rest/openapi.yaml`
- `packages/server/src/composition/wire.ts` — DI composition root.
- `packages/server/src/composition/config.ts` — zod-validated env.
- `packages/server/src/bin/standalone.ts` — standalone entry.
- `packages/server/src/bin/sidecar.ts` — K8s sidecar entry.
- `packages/server/src/crons/refresh-sanctions.ts`
- `packages/server/src/crons/verify-audit-chain.ts`

### Deployment

- `Dockerfile` — multi-stage (builder + runner).
- `docker-compose.yml` — compliance-core + postgres + redis + vault + otel-collector.
- `docker-compose.dev.yml` — dev overrides.
- `helm/compliance-core/Chart.yaml`
- `helm/compliance-core/values.yaml`
- `helm/compliance-core/templates/deployment.yaml`
- `helm/compliance-core/templates/service.yaml`
- `helm/compliance-core/templates/configmap.yaml`
- `helm/compliance-core/templates/sealed-secret.yaml`
- `helm/compliance-core/templates/servicemonitor.yaml`

### Docs

- `docs/getting-started.md`
- `docs/architecture.md`
- `docs/security.md`
- `docs/api-reference/grpc.md`
- `docs/api-reference/rest.md`
- `docs/adapters/persona.md`
- `docs/adapters/ondato.md`
- `docs/adapters/ofac.md`
- `docs/operations/deployment.md`
- `docs/operations/observability.md`

### Scripts

- `scripts/create-github-issues.sh` — bulk issue creation (Appendix A).
- `scripts/create-github-labels.sh` — label taxonomy (Appendix B).
- `scripts/dev-bootstrap.sh` — spin up docker-compose, seed vault, run migrations.

**Total Fase 1 files created/modified: ~145.**

---

## Global conventions

- **Conventional Commits** on every commit: `feat(scope): ...`, `test(scope): ...`, `chore(scope): ...`, `docs(scope): ...`. Scopes: `proto`, `domain`, `app`, `persona`, `ondato`, `ofac`, `postgres`, `vault`, `otel`, `grpc`, `rest`, `docker`, `helm`, `docs`, `ci`.
- **Security rule (PII)**: no task that touches `Identity`, `DocumentRef`, `EvidenceRef`, provider credentials, or webhook payloads may log the raw value. Use `PIIString` VO + pino redact paths. Error messages MUST use correlation IDs, never PII.
- **Security rule (credentials)**: provider API keys flow only via `ProviderCredentialVault`. No env-var fallback in code paths. Tests use in-memory vault seeded with fakes.
- **TDD**: each task writes failing tests first, then implementation, then refactor. `pnpm test --filter <package>` must be green before `git commit`.
- **GitHub issue per task**: after the implementation + commit steps, run `gh issue create` with the title `[Fase 1] Task N — <title>` and label `phase/1` plus scope labels.

---

## Task 1 — pnpm workspace scaffold

**Files:** `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.gitignore`, `.env.example`, `tsconfig.base.json`.

- [ ] Write `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - "packages/*"
  ```
- [ ] Write root `package.json`:
  ```json
  {
    "name": "compliance-core",
    "private": true,
    "version": "0.1.0-dev",
    "packageManager": "pnpm@9.12.0",
    "engines": { "node": ">=22.11.0" },
    "scripts": {
      "build": "pnpm -r --filter './packages/*' build",
      "test": "vitest run",
      "test:watch": "vitest",
      "lint": "biome check .",
      "lint:fix": "biome check --write .",
      "proto:gen": "buf generate",
      "typecheck": "pnpm -r --filter './packages/*' typecheck"
    },
    "devDependencies": {
      "@biomejs/biome": "1.9.4",
      "@bufbuild/buf": "1.47.2",
      "typescript": "5.6.3",
      "vitest": "2.1.4",
      "@vitest/coverage-v8": "2.1.4"
    }
  }
  ```
- [ ] Write `.nvmrc` with `22.11.0`.
- [ ] Write `.gitignore` (node_modules, dist, coverage, .env, *.tsbuildinfo, .turbo, .pnpm-store).
- [ ] Write `.env.example` documenting: `DATABASE_URL`, `REDIS_URL`, `VAULT_ADDR`, `VAULT_TOKEN`, `PERSONA_WEBHOOK_SECRET_PATH`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `GRPC_PORT=50071`, `REST_PORT=8767`, `LOG_LEVEL=info`.
- [ ] Write `tsconfig.base.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2023",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": true,
      "isolatedModules": true,
      "declaration": true,
      "sourceMap": true,
      "skipLibCheck": true,
      "lib": ["ES2023"],
      "types": ["node"]
    }
  }
  ```
- [ ] Run `pnpm install` → expect `Lockfile created` and no peer-dep errors.
- [ ] Verify `node --version` matches `.nvmrc`.
- [ ] **Commit:** `chore(scaffold): pnpm workspace + base tsconfig + env template`.
- [ ] **GitHub issue:** `gh issue create --repo lapc506/compliance-core --title "[Fase 1] Task 1 — pnpm workspace scaffold" --label "phase/1,scope/scaffold,type/chore" --body "Initialize pnpm monorepo with packages/* layout, strict tsconfig base, Node 22 LTS pin."`.

---

## Task 2 — Biome lint + format config

**Files:** `biome.json`, CI lint wiring.

- [ ] Write `biome.json`:
  ```json
  {
    "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
    "organizeImports": { "enabled": true },
    "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
    "linter": {
      "enabled": true,
      "rules": {
        "recommended": true,
        "suspicious": { "noExplicitAny": "error", "noConsoleLog": "error" },
        "style": { "useConst": "error", "noNonNullAssertion": "error" }
      }
    },
    "files": { "ignore": ["**/dist", "**/coverage", "**/generated", "**/*.sql"] }
  }
  ```
- [ ] Add lint-staged style: document that `pnpm lint:fix` MUST pass before commit (enforced in CI, not git hook in Fase 1).
- [ ] Add placeholder file `packages/.gitkeep` so `pnpm install` is happy.
- [ ] Run `pnpm lint` on empty tree → expect `Checked 0 files`.
- [ ] **Commit:** `chore(ci): add Biome linter + formatter config`.
- [ ] **GitHub issue:** `gh issue create --title "[Fase 1] Task 2 — Biome lint + format" --label "phase/1,scope/ci,type/chore"`.

---

## Task 3 — Vitest root config + coverage thresholds

**Files:** `vitest.config.ts`.

- [ ] Write `vitest.config.ts`:
  ```ts
  import { defineConfig } from "vitest/config";
  export default defineConfig({
    test: {
      globals: false,
      include: ["packages/**/*.{test,spec}.ts"],
      exclude: ["**/dist/**", "**/generated/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        thresholds: {
          "packages/core/src/domain/**": { lines: 95, functions: 95, statements: 95, branches: 90 },
          "packages/core/src/app/**": { lines: 85, functions: 85, statements: 85, branches: 80 }
        },
        exclude: ["**/generated/**", "**/*.test.ts", "**/dto.ts"]
      },
      setupFiles: ["./vitest.setup.ts"]
    }
  });
  ```
- [ ] Write `vitest.setup.ts` that freezes `Date.now()` via fake timers only when tests opt in (export helper `useFixedClock(iso)`).
- [ ] Add placeholder smoke test `packages/.smoke.test.ts` to verify setup: `import { test, expect } from "vitest"; test("vitest boots", () => expect(1 + 1).toBe(2));`.
- [ ] Run `pnpm test` → expect 1 passing, 0 failing.
- [ ] Delete smoke test after verification.
- [ ] **Commit:** `chore(ci): add Vitest config with coverage thresholds`.
- [ ] **GitHub issue:** `gh issue create --title "[Fase 1] Task 3 — Vitest + coverage" --label "phase/1,scope/ci,type/chore"`.

---

## Task 4 — CI workflow (GitHub Actions)

**Files:** `.github/workflows/ci.yml`.

- [ ] Write CI with jobs: `lint`, `typecheck`, `test`, `proto-lint`, `build`. Matrix node 22.x. Cache pnpm store. Upload coverage to Codecov (token via repo secret).
- [ ] Add concurrency group `ci-${{ github.ref }}` with cancel-in-progress.
- [ ] Job `proto-lint` runs `buf lint` + `buf breaking --against '.git#branch=main'`.
- [ ] Job `test` runs `pnpm test -- --coverage`.
- [ ] Job `build` runs `pnpm build`.
- [ ] Push branch + open draft PR to verify CI boots (or trigger via `workflow_dispatch`).
- [ ] **Commit:** `ci: add lint/typecheck/test/proto/build matrix`.
- [ ] **GitHub issue:** `gh issue create --title "[Fase 1] Task 4 — CI workflow" --label "phase/1,scope/ci,type/chore"`.

---

## Task 5 — GitHub labels taxonomy

**Files:** `scripts/create-github-labels.sh`.

- [ ] Write bash script that uses `gh label create` idempotently with `|| gh label edit` fallback. Labels:
  - `phase/1`, `phase/2`, `phase/3`, `phase/4`, `phase/5`.
  - `scope/scaffold`, `scope/proto`, `scope/domain`, `scope/app`, `scope/persona`, `scope/ondato`, `scope/ofac`, `scope/postgres`, `scope/vault`, `scope/otel`, `scope/grpc`, `scope/rest`, `scope/docker`, `scope/helm`, `scope/docs`, `scope/ci`.
  - `type/feat`, `type/fix`, `type/chore`, `type/docs`, `type/test`, `type/refactor`.
  - `security/pii` — task handles PII, must be reviewed for leak-safety.
  - `security/credentials` — task handles provider credentials.
  - `security/audit` — task affects audit chain integrity.
  - `priority/p0` (blocker), `priority/p1`, `priority/p2`.
- [ ] Make script executable `chmod +x scripts/create-github-labels.sh`.
- [ ] Dry-run log output shows each label command.
- [ ] Run `bash scripts/create-github-labels.sh` against `lapc506/compliance-core` once labels exist.
- [ ] **Commit:** `chore(ci): add GitHub labels bootstrap script`.
- [ ] **GitHub issue:** `gh issue create --title "[Fase 1] Task 5 — Labels taxonomy" --label "phase/1,scope/ci,type/chore"`.

---

## Task 6 — Domain value objects: UUID, Hex32, ISODateTime, Jurisdiction, Decimal

**Files:** `packages/core/src/domain/value-objects/*.ts` (5 files) + tests.

- [ ] Write failing test `uuid.test.ts` that asserts: `UUID.parse("not-a-uuid")` throws `InvalidUuid`; `UUID.parse("550e8400-e29b-41d4-a716-446655440000")` returns branded string.
- [ ] Implement `uuid.ts`:
  ```ts
  import { z } from "zod";
  const schema = z.string().uuid();
  export type UUID = string & { readonly __brand: "UUID" };
  export const UUID = {
    parse(input: unknown): UUID {
      const r = schema.safeParse(input);
      if (!r.success) throw new InvalidUuid(r.error.message);
      return r.data as UUID;
    },
    isUuid(input: unknown): input is UUID { return schema.safeParse(input).success; }
  };
  export class InvalidUuid extends Error { constructor(msg: string) { super(`Invalid UUID: ${msg}`); this.name = "InvalidUuid"; } }
  ```
- [ ] Repeat pattern for `Hex32` (SHA-256 hex, 64 chars, lowercase), `ISODateTime` (RFC3339 with offset), `Jurisdiction` (enum), `Decimal` (bigint+scale pair to avoid float rounding in risk scores).
- [ ] Every VO has `.parse`, `.tryParse`, `.toString`, and is immutable.
- [ ] Security note for `Hex32`: comparisons MUST use `crypto.timingSafeEqual` — add helper `Hex32.equals(a, b)`.
- [ ] Run `pnpm test --filter core packages/core/src/domain/value-objects` → 5 files, all green.
- [ ] **Commit:** `feat(domain): add core value objects (UUID, Hex32, ISODateTime, Jurisdiction, Decimal)`.
- [ ] **GitHub issue:** `gh issue create --title "[Fase 1] Task 6 — Domain VOs" --label "phase/1,scope/domain,type/feat"`.

---

## Task 7 — Domain VO: TaxId (multi-jurisdiction)

**Files:** `packages/core/src/domain/value-objects/tax-id.ts` + test.

- [ ] Failing tests:
  - `TaxId.parse({ country: "CR", value: "1-1234-5678" })` → valid cédula.
  - `TaxId.parse({ country: "MX", value: "VECJ880326XXX" })` → valid RFC.
  - `TaxId.parse({ country: "CO", value: "1020304050" })` → valid cédula.
  - `TaxId.parse({ country: "US", value: "PASSPORT123" })` → only accepts passport numeric/alnum via PASSPORT kind.
  - Invalid checksums reject.
- [ ] Implement per-country regex + checksum (CR cédula digit, MX RFC homoclave length 12/13, CO cédula 6-10 digits).
- [ ] Expose `redacted(): string` → last 4 only (`****-5678`). Document that logs MUST call `redacted()`.
- [ ] **Security note:** TaxId toString returns redacted form by default; unredacted access only via explicit `unsafeReveal()` used by adapters when calling provider APIs.
- [ ] Run tests.
- [ ] **Commit:** `feat(domain): add TaxId VO with multi-jurisdiction validators + redaction`.
- [ ] **GitHub issue:** `gh issue create --title "[Fase 1] Task 7 — TaxId VO" --label "phase/1,scope/domain,type/feat,security/pii"`.

---

## Task 8 — Domain VO: DocumentRef + PIIString

**Files:** `packages/core/src/domain/value-objects/document-ref.ts`, `packages/core/src/domain/value-objects/pii-string.ts` + tests.

- [ ] Failing test `pii-string.test.ts`: `String(PIIString.from("Luis Andres"))` returns `"[REDACTED]"`; `.unsafeReveal()` returns original; `JSON.stringify(obj)` serializes as `"[REDACTED]"`.
- [ ] Implement `PIIString`:
  ```ts
  const VALUE = Symbol("pii.value");
  export class PIIString {
    private constructor(v: string) { (this as any)[VALUE] = v; }
    static from(v: string): PIIString { return new PIIString(v); }
    unsafeReveal(): string { return (this as any)[VALUE]; }
    toString(): string { return "[REDACTED]"; }
    toJSON(): string { return "[REDACTED]"; }
  }
  ```
- [ ] Implement `DocumentRef`: `{ kind: DocumentKind, number: PIIString, issuedBy: Jurisdiction, issuedAt: ISODate, expiresAt?: ISODate, evidenceBlobId?: UUID }`.
- [ ] Test that `util.inspect(documentRef)` does not leak the document number.
- [ ] Run tests — add Node's `util.inspect.custom` symbol handler.
- [ ] **Commit:** `feat(domain): add PIIString + DocumentRef with safe-by-default serialization`.
- [ ] **GitHub issue:** `gh issue create --title "[Fase 1] Task 8 — PIIString + DocumentRef" --label "phase/1,scope/domain,type/feat,security/pii"`.

---

## Task 9 — Domain entity: Identity

**Files:** `packages/core/src/domain/entities/identity.ts` + test.

- [ ] Failing tests:
  - `Identity.create({ taxId, fullName, dateOfBirth, country, documents: [] })` returns entity with generated UUID and timestamps.
  - Adding a verification reference returns a new Identity (immutability).
  - Invalid DOB (future date) throws.
- [ ] Implement per spec §4.1 with `Readonly<>` fields. All mutators return new instances.
- [ ] `toJSON()` uses `PIIString` semantics for `fullName` (wrap it internally so logs redact).
- [ ] Run tests.
- [ ] **Commit:** `feat(domain): add Identity aggregate root`.
- [ ] **GitHub issue:** `[Fase 1] Task 9 — Identity entity` · labels `phase/1,scope/domain,type/feat,security/pii`.

---

## Task 10 — Domain entity: BusinessEntity (skeleton only)

**Files:** `packages/core/src/domain/entities/business-entity.ts` + test.

- [ ] Failing tests:
  - `BusinessEntity.create({ legalName, registrationId, country, formationDate, industry })` returns entity.
  - `addUBO()` appends but does not verify (KYB verification deferred to Fase 2).
  - Ownership percentages summing > 100 throws.
- [ ] Implement minimal skeleton per spec §4.1. Do NOT implement KYB flows — this entity exists so proto messages compile.
- [ ] Mark file with header comment: `// NOTE: Fase 1 skeleton only. Full KYB support lands in Fase 2.`
- [ ] Run tests.
- [ ] **Commit:** `feat(domain): add BusinessEntity skeleton (KYB deferred to Fase 2)`.
- [ ] **GitHub issue:** `[Fase 1] Task 10 — BusinessEntity skeleton` · labels `phase/1,scope/domain,type/feat`.

---

## Task 11 — Domain entity: VerificationSession + state machine

**Files:** `packages/core/src/domain/entities/verification-session.ts`, `packages/core/src/domain/services/state-machine.ts` + tests.

- [ ] Failing tests (spec §4.2):
  - `INITIATED → PENDING` valid.
  - `INITIATED → VERIFIED` throws `InvalidVerificationStateTransition`.
  - `PENDING → VERIFIED` valid with decision=PASS.
  - `PENDING → FAILED` valid with decision=FAIL.
  - `VERIFIED → anything` throws (terminal).
  - `EXPIRED → anything` throws.
  - Re-verification produces new session with `replacesSessionId` set.
- [ ] Implement state transition table:
  ```ts
  const TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
    INITIATED: ["PENDING", "EXPIRED"],
    PENDING: ["VERIFIED", "FAILED", "EXPIRED"],
    VERIFIED: [],
    FAILED: [],
    EXPIRED: []
  };
  ```
- [ ] `VerificationSession.transition(to, payload)` returns new session + domain event.
- [ ] Property-based test (fast-check) asserts: for all random transition sequences, the machine never ends in an inconsistent state.
- [ ] Run tests → green.
- [ ] **Commit:** `feat(domain): add VerificationSession entity + state machine`.
- [ ] **GitHub issue:** `[Fase 1] Task 11 — VerificationSession state machine` · labels `phase/1,scope/domain,type/feat`.

---

## Task 12 — Domain entity: SanctionsMatch

**Files:** `packages/core/src/domain/entities/sanctions-match.ts` + test.

- [ ] Failing tests:
  - `SanctionsMatch.create(...)` sets `reviewStatus=PENDING`.
  - `.confirm(reviewer, notes)` transitions to `CONFIRMED_MATCH`.
  - `.markFalsePositive(reviewer, notes)` transitions to `FALSE_POSITIVE`.
  - Re-reviewing a confirmed match throws `AlreadyReviewed`.
  - `confidence` out of `[0, 100]` throws.
- [ ] Implement per spec §4.1.
- [ ] Run tests.
- [ ] **Commit:** `feat(domain): add SanctionsMatch entity with review lifecycle`.
- [ ] **GitHub issue:** `[Fase 1] Task 12 — SanctionsMatch entity` · labels `phase/1,scope/domain,type/feat`.

---

## Task 13 — Domain entity: ComplianceEvent + AuditEntry

**Files:** `packages/core/src/domain/entities/compliance-event.ts`, `packages/core/src/domain/entities/audit-entry.ts` + tests.

- [ ] Failing tests:
  - `ComplianceEvent` requires `seqNumber`, `prevHash`, `hash`, `eventType`, `actor`, `occurredAt`.
  - Constructing with mismatched hash (recomputed) throws `HashMismatch`.
  - Payload with raw `PIIString` values is rejected — payloads must already be redacted.
- [ ] Implement per spec §4.1 with hash computation in constructor:
  ```ts
  const recomputed = sha256Hex(`${seqNumber}|${prevHash}|${eventType}|${actorKey(actor)}|${subjectKey(subjectRef)}|${canonicalJson(payload)}|${occurredAt}`);
  if (recomputed !== hash) throw new HashMismatch(seqNumber, hash, recomputed);
  ```
- [ ] Canonical JSON: sorted keys, no whitespace, UTF-8.
- [ ] `AuditEntry` wraps `ComplianceEvent` with `createdAt` and `persistedBy` for DB layer.
- [ ] Run tests.
- [ ] **Commit:** `feat(domain): add ComplianceEvent + AuditEntry with self-validating hash`.
- [ ] **GitHub issue:** `[Fase 1] Task 13 — ComplianceEvent` · labels `phase/1,scope/domain,type/feat,security/audit`.

---

## Task 14 — Domain service: AuditChainService (SHA-256 chain + tamper detection)

**Files:** `packages/core/src/domain/services/audit-chain-service.ts` + test.

- [ ] Failing tests:
  - `append(event)` computes `hash` from `prevHash`, increments `seqNumber`.
  - Genesis event has `prevHash = "0".repeat(64)` and `seqNumber = 1n`.
  - `verify(events)` returns `{ ok: true }` on an intact chain.
  - Tampering payload in event N → `verify` returns `{ ok: false, brokenAt: N, reason: "hash-mismatch" }`.
  - Removing event N (gap in seqNumber) → `{ ok: false, brokenAt: N+1, reason: "seq-gap" }`.
  - Swapping two events (reordering) → detected via hash chain.
  - Fixture test: 1000-event chain verified in < 100ms.
- [ ] Implement `AuditChainService.append` + `.verify`. Pure domain, no I/O.
- [ ] `sha256Hex`: use Node `node:crypto` `createHash("sha256")` — document that Web Crypto fallback lands when we target edge runtimes.
- [ ] Add `demonstrateTampering` fixture test that builds chain, mutates byte, confirms detection. This test IS the "tamper detection test" required by the spec.
- [ ] Run tests.
- [ ] **Commit:** `feat(domain): add AuditChainService with SHA-256 chain + tamper detection`.
- [ ] **GitHub issue:** `[Fase 1] Task 14 — AuditChainService` · labels `phase/1,scope/domain,type/feat,security/audit,priority/p0`.

---

## Task 15 — Domain service: MatchNormalizer (Jaro-Winkler + Double Metaphone)

**Files:** `packages/core/src/domain/services/match-normalizer.ts` + test + fixtures.

- [ ] Failing tests with curated fixtures (`packages/core/src/domain/services/__fixtures__/matcher-cases.json`):
  - **Positive matches**:
    - `"Vladimir Putin"` vs OFAC entry `"PUTIN, Vladimir Vladimirovich"` → confidence ≥ 85, name-match.
    - `"Osama bin Laden"` vs `"BIN LADEN, Usama"` → confidence ≥ 80, transliteration-tolerant.
    - `"Juan Perez"` (no accent) vs `"Juan Pérez"` → confidence ≥ 95 (diacritic-insensitive).
    - Exact DOB match boosts confidence by +10.
  - **Negative matches**:
    - `"John Smith"` vs `"Juan Smith"` → confidence < 70 (different first names).
    - `"María González"` vs `"Mario González"` → confidence < 75 (gender-differentiated diminutives).
    - Random common names like `"Carlos Rodríguez"` against large fixture list → no false positives at threshold 80.
- [ ] Implement:
  ```ts
  import jaroWinkler from "jaro-winkler";
  import { doubleMetaphone } from "double-metaphone";
  export interface MatchCandidate { fullName: string; aliases?: string[]; dob?: string; }
  export class MatchNormalizer {
    normalize(s: string): string {
      return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    }
    score(a: MatchCandidate, b: MatchCandidate): number {
      const na = this.normalize(a.fullName); const nb = this.normalize(b.fullName);
      const jw = jaroWinkler(na, nb) * 100;
      const [a1] = doubleMetaphone(na); const [b1] = doubleMetaphone(nb);
      const phonetic = a1 === b1 ? 10 : 0;
      const dobBoost = a.dob && b.dob && a.dob === b.dob ? 10 : 0;
      return Math.min(100, Math.round(jw + phonetic + dobBoost));
    }
  }
  ```
- [ ] Install deps: `pnpm add -D jaro-winkler double-metaphone` in `packages/core`.
- [ ] Run tests. Document precision/recall on fixture set in header comment (target ≥ 0.95 per spec §10).
- [ ] **Commit:** `feat(domain): add MatchNormalizer (Jaro-Winkler + Double Metaphone + DOB)`.
- [ ] **GitHub issue:** `[Fase 1] Task 15 — MatchNormalizer` · labels `phase/1,scope/domain,type/feat,priority/p0`.

---

## Task 16 — Domain events + errors

**Files:** `packages/core/src/domain/events/*.ts`, `packages/core/src/domain/errors.ts` + test.

- [ ] Implement 6 events: `VerificationStarted`, `VerificationCompleted`, `VerificationFailed`, `SanctionsMatchFound`, `AuditIntegrityBroken`, `ListRefreshed`. Each is a frozen object with `eventType`, `occurredAt`, `aggregateId`, `payload` (redacted).
- [ ] Implement errors: `InvalidVerificationStateTransition`, `InvalidUuid`, `HashMismatch`, `AlreadyReviewed`, `ProviderError` (with `providerCode`, `isRetryable`, `correlationId`), `CredentialNotFound`, `WebhookSignatureInvalid`, `IdempotencyConflict`.
- [ ] Every error extends `DomainError` base with `code: string` and `toJSON()` that never includes PII.
- [ ] Failing test: each error round-trips through `JSON.stringify` without leaking original message when constructed with PII (use `PIIString.from("...")` in cause).
- [ ] Run tests.
- [ ] **Commit:** `feat(domain): add domain events + typed error hierarchy`.
- [ ] **GitHub issue:** `[Fase 1] Task 16 — Domain events + errors` · labels `phase/1,scope/domain,type/feat`.

---

## Task 17 — Application ports: infrastructure (Clock, Logger, Metrics, Tracing, EventBus, Idempotency, SecretsStore)

**Files:** `packages/core/src/app/ports/{clock,logger,metrics,tracing,event-bus,idempotency,secrets-store}-port.ts` + contract tests.

- [ ] Write port interfaces only (no implementations in this task):
  ```ts
  export interface ClockPort { now(): Date; }
  export interface LoggerPort { info(msg: string, ctx?: Record<string, unknown>): void; warn(...): void; error(...): void; child(bindings: Record<string, unknown>): LoggerPort; }
  export interface MetricsPort { counter(name: string, labels?: Record<string, string>): { inc(n?: number): void }; histogram(name: string, labels?: Record<string, string>): { observe(v: number): void }; gauge(...): ...; }
  export interface TracingPort { startSpan<T>(name: string, fn: (span: Span) => Promise<T>, attrs?: Record<string, unknown>): Promise<T>; }
  export interface EventBusPort { publish(event: DomainEvent): Promise<void>; subscribe(type: string, handler: (e: DomainEvent) => Promise<void>): Unsubscribe; }
  export interface IdempotencyPort { run<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>; }
  export interface SecretsStorePort { get(path: string): Promise<string>; watch(path: string, cb: (value: string) => void): Unsubscribe; }
  ```
- [ ] Add contract test helpers in `packages/core/src/app/ports/__contract__/*.ts` that any adapter must pass (`runClockContract(port)`, etc.).
- [ ] Run contract helpers against in-memory fakes (one fake per port) in a test file.
- [ ] **Commit:** `feat(app): add infrastructure ports + contract tests`.
- [ ] **GitHub issue:** `[Fase 1] Task 17 — Infra ports` · labels `phase/1,scope/app,type/feat`.

---

## Task 18 — Application ports: domain (IdentityVerification, SanctionsScreening, AuditLog, VerificationRepository, ProviderCredentialVault)

**Files:** `packages/core/src/app/ports/*.ts` (5 files) + contract tests.

- [ ] Interfaces per spec §5:
  ```ts
  export interface IdentityVerificationPort {
    startVerification(input: StartInput): Promise<StartOutput>;
    getSessionStatus(id: UUID): Promise<VerificationSession>;
    fetchEvidence(id: UUID): Promise<EvidenceBundle>;
    quickCheck(receiverId: string): Promise<QuickCheckResult>; // stub v1
  }
  export interface SanctionsScreeningPort {
    screen(subject: IdentityOrBusiness): Promise<SanctionsMatch[]>;
    refreshLists(source: SanctionsList): Promise<RefreshReport>;
    getMatch(id: UUID): Promise<SanctionsMatch | null>;
    resolveMatch(id: UUID, resolution: MatchResolution): Promise<SanctionsMatch>;
  }
  export interface AuditLogPort {
    append(event: Omit<ComplianceEvent, "seqNumber" | "hash" | "prevHash">): Promise<ComplianceEvent>;
    verify(fromSeq: bigint, toSeq: bigint): Promise<IntegrityReport>;
    export(period: Period): AsyncIterable<ComplianceEvent>;
    stream(fromSeq: bigint): AsyncIterable<ComplianceEvent>;
  }
  export interface VerificationRepositoryPort {
    saveIdentity(id: Identity): Promise<void>;
    getIdentity(id: UUID): Promise<Identity | null>;
    saveSession(s: VerificationSession): Promise<void>;
    getSession(id: UUID): Promise<VerificationSession | null>;
    listSessionsBySubject(subjectId: UUID): Promise<VerificationSession[]>;
    saveMatch(m: SanctionsMatch): Promise<void>;
    listMatchesBySubject(subjectId: UUID): Promise<SanctionsMatch[]>;
  }
  export interface ProviderCredentialVault {
    loadCredentials(tenantId: string, provider: ProviderCode): Promise<ProviderCredentials>;
    rotate(tenantId: string, provider: ProviderCode): Promise<void>;
  }
  ```
- [ ] Write contract tests that any implementation must satisfy (e.g., `AuditLogPort.verify` must detect tampering when the storage is manually corrupted).
- [ ] **Security note (ProviderCredentialVault):** credentials returned via a `Disposable` wrapper that zeroes the buffer on `[Symbol.dispose]`. Tests assert credentials are not held past request scope.
- [ ] Run contract tests against in-memory fakes.
- [ ] **Commit:** `feat(app): add domain ports (IdentityVerification, Sanctions, AuditLog, Repository, Vault)`.
- [ ] **GitHub issue:** `[Fase 1] Task 18 — Domain ports` · labels `phase/1,scope/app,type/feat,security/credentials`.

---

## Task 19 — Application commands: StartVerification + CompleteVerification

**Files:** `packages/core/src/app/commands/start-verification.ts`, `packages/core/src/app/commands/complete-verification.ts` + tests.

- [ ] Failing tests (use in-memory fakes for all ports):
  - `StartVerification` creates an `Identity` (or loads existing), creates `VerificationSession` in `INITIATED` state, calls `IdentityVerificationPort.startVerification`, persists session in `PENDING`, appends `VerificationStarted` event to audit log, publishes event on bus.
  - Idempotency: calling twice with same `idempotencyKey` returns same `sessionId`.
  - Consent not granted → throws `ConsentRequired`.
  - Provider failure → session stays `INITIATED`, error bubbles up as `ProviderError`, audit event `VerificationFailed` appended.
- [ ] `CompleteVerification` (invoked from webhook):
  - Loads session by `providerSessionId`.
  - Applies provider decision (PASS/FAIL/MANUAL_REVIEW).
  - Transitions state to `VERIFIED` or `FAILED`.
  - Persists updated session.
  - Appends `VerificationCompleted` or `VerificationFailed` event.
  - Idempotent: replaying the same webhook does not produce duplicate events.
- [ ] Implement both commands with explicit `execute(input, deps)` signature — no DI container in domain.
- [ ] **Security note:** command inputs MUST use `PIIString` for names; logging uses `.child({ sessionId })`, never `.child({ fullName })`.
- [ ] Run tests.
- [ ] **Commit:** `feat(app): add StartVerification + CompleteVerification commands`.
- [ ] **GitHub issue:** `[Fase 1] Task 19 — Verification commands` · labels `phase/1,scope/app,type/feat,security/pii,priority/p0`.

---

## Task 20 — Application commands + queries (remaining Fase 1)

**Files:** `packages/core/src/app/commands/{screen-sanctions,refresh-sanctions-lists,append-audit-event}.ts`, `packages/core/src/app/queries/*.ts` + tests.

- [ ] Commands:
  - `ScreenSanctions(subjectId)`: loads subject, calls `SanctionsScreeningPort.screen`, persists matches above threshold (default 80), appends `SanctionsMatchFound` per match, returns list.
  - `RefreshSanctionsLists(source)`: calls adapter's `refreshLists`, updates metadata, appends `ListRefreshed` audit event.
  - `AppendAuditEvent(event)`: thin wrapper used by other commands.
- [ ] Queries:
  - `GetVerificationStatus(sessionId)` → `VerificationSession` or throws `NotFound`.
  - `ListVerifications({ subjectId, status, from, to, limit })` → paginated sessions.
  - `GetSanctionsMatches({ subjectId, status })` → matches.
  - `VerifyAuditIntegrity({ fromSeq, toSeq })` → `IntegrityReport`.
  - `ExportAuditLog({ period })` → `AsyncIterable<ComplianceEvent>`.
- [ ] Tests cover happy paths + one error path per handler.
- [ ] **Commit:** `feat(app): add remaining Fase 1 commands + queries`.
- [ ] **GitHub issue:** `[Fase 1] Task 20 — Commands + queries` · labels `phase/1,scope/app,type/feat`.

---

## Task 21 — Application middleware: PII redactor + tracing + idempotency

**Files:** `packages/core/src/app/middleware/*.ts` + tests with PII fixtures.

- [ ] `pii-redactor.ts`: wraps a handler, walks input/output, replaces any `PIIString` with `"[REDACTED]"` before they hit logger/tracer, preserves them in the actual call return.
- [ ] **Fixture test (required by spec):** logs for a command whose input contains cédula `1-1234-5678` and passport `P12345678` must contain neither value verbatim. Use pino with redact paths + snapshot the log stream.
- [ ] Integration with pino: `redact: { paths: ["*.taxId", "*.fullName", "*.documentNumber", "*.evidenceBlob", "req.body.evidence"], censor: "[REDACTED]" }`.
- [ ] `tracing.ts`: wraps handler in `startSpan`, attaches `correlation_id`, `tenant_id`, records exceptions (with redacted messages).
- [ ] `idempotency.ts`: uses `IdempotencyPort`, keyed by `(tenantId, commandName, idempotencyKey)`.
- [ ] `metrics.ts`: counts `command_total{name, result}`, histogram `command_duration_seconds`.
- [ ] `auth.ts`: verifies JWT or mTLS peer identity, injects `Principal` into context.
- [ ] Run tests — snapshot assertion on log output.
- [ ] **Commit:** `feat(app): add middleware chain (PII redactor, tracing, idempotency, metrics, auth)`.
- [ ] **GitHub issue:** `[Fase 1] Task 21 — Middleware chain` · labels `phase/1,scope/app,type/feat,security/pii,priority/p0`.

---

## Task 22 — Proto v1: common.proto + admin.proto + screening.proto

**Files:** `proto/compliance/v1/{common,admin,screening}.proto`, `proto/buf.yaml`, `proto/buf.gen.yaml`.

- [ ] Write `buf.yaml`:
  ```yaml
  version: v2
  modules:
    - path: proto
  lint: { use: [STANDARD] }
  breaking: { use: [FILE] }
  ```
- [ ] Write `buf.gen.yaml` targeting `@bufbuild/protoc-gen-es` + `@connectrpc/protoc-gen-connect-es` → `packages/proto/src/generated`.
- [ ] Write `common.proto`:
  ```proto
  syntax = "proto3";
  package compliance_core.v1;
  import "google/protobuf/timestamp.proto";
  message UUID { string value = 1; }
  message PIIString { string value = 1; }            // must be redacted by middleware
  enum Jurisdiction { JURISDICTION_UNSPECIFIED = 0; CR = 1; MX = 2; CO = 3; GT = 4; US = 5; EU = 6; OTHER = 7; }
  message SubjectRef { oneof kind { UUID identity_id = 1; UUID business_id = 2; } }
  message Ack { bool ok = 1; string message = 2; }
  ```
- [ ] Write `admin.proto` with `StartVerification`, `GetVerificationStatus`, `ListVerifications`, `QuickCheck` (stub), and stubs for `VerifyAge`, `VerifyBusiness`, `RequestProofOfPersonhood`, `VerifyProofOfPersonhood` returning `UNIMPLEMENTED` until later fases.
- [ ] Write `screening.proto` with `ScreenSanctions`, `ResolveMatch`, `RefreshSanctionsLists`, `GetRiskScore`. Mark `ScreenPEP` and `ScreenAdverseMedia` as UNIMPLEMENTED.
- [ ] Annotate every PII field with a custom option `(compliance.pii) = true` (define option in common.proto).
- [ ] Run `pnpm proto:gen` → outputs to `packages/proto/src/generated/`.
- [ ] Write `packages/proto/package.json` + `tsconfig.json`.
- [ ] Smoke test: `pnpm --filter proto build` compiles generated TS.
- [ ] **Commit:** `feat(proto): add v1 common + admin + screening services`.
- [ ] **GitHub issue:** `[Fase 1] Task 22 — Proto common/admin/screening` · labels `phase/1,scope/proto,type/feat`.

---

## Task 23 — Proto v1: audit.proto + health.proto + AML/whistle stubs

**Files:** `proto/compliance/v1/{audit,health,aml,whistle}.proto`.

- [ ] `audit.proto`:
  ```proto
  service ComplianceAudit {
    rpc AppendEvent(AppendEventRequest) returns (Ack);
    rpc VerifyIntegrity(VerifyIntegrityRequest) returns (IntegrityReport);
    rpc ExportAuditLog(ExportAuditLogRequest) returns (stream ComplianceEvent);
  }
  message ComplianceEvent { int64 seq_number = 1; string prev_hash = 2; string hash = 3; string event_type = 4; google.protobuf.Timestamp occurred_at = 5; ... }
  message IntegrityReport { bool ok = 1; int64 broken_at = 2; string reason = 3; }
  ```
- [ ] `health.proto`: `GetProviderHealth`, `GetListFreshness`, `GetCircuitBreakerState`.
- [ ] `aml.proto` + `whistle.proto`: declared but every RPC returns UNIMPLEMENTED in Fase 1 — proto exists so consumers see the shape.
- [ ] Run `pnpm proto:gen`, verify TS compiles.
- [ ] `buf breaking` against main — should be fine since first version.
- [ ] **Commit:** `feat(proto): add v1 audit + health + aml/whistle stubs`.
- [ ] **GitHub issue:** `[Fase 1] Task 23 — Proto audit/health/stubs` · labels `phase/1,scope/proto,type/feat`.

---

## Task 24 — PostgreSQL schema: identities + verifications (Drizzle)

**Files:** `packages/adapter-postgres/src/schema/{identities,verifications,index}.ts`, `drizzle.config.ts`, initial migration.

- [ ] `drizzle.config.ts`:
  ```ts
  import type { Config } from "drizzle-kit";
  export default {
    schema: "./src/schema/index.ts",
    out: "./src/migrations",
    dialect: "postgresql",
    dbCredentials: { url: process.env.DATABASE_URL! }
  } satisfies Config;
  ```
- [ ] Write `identities.ts` with `identities` table: `id uuid PK`, `tax_id_ciphertext bytea`, `tax_id_iv bytea`, `tax_id_auth_tag bytea`, `dek_ciphertext bytea`, `country text NOT NULL`, `full_name_ciphertext bytea`, `dob_ciphertext bytea`, `created_at timestamptz`, `updated_at timestamptz`. Index on `country`.
- [ ] Write `verifications.ts` with `verification_sessions` table: `id uuid PK`, `subject_kind text`, `subject_id uuid`, `kind text`, `provider text`, `provider_session_id text`, `status text`, `decision_verdict text`, `decision_reasons text[]`, `initiated_at timestamptz`, `completed_at timestamptz`, `expires_at timestamptz`, `replaces_session_id uuid`. Indexes on `(subject_id, status)`, `(provider_session_id)`.
- [ ] Export from `index.ts`.
- [ ] Run `pnpm drizzle-kit generate` → produces `0001_init.sql`.
- [ ] Write repository wire in later task.
- [ ] Run `docker compose up postgres -d && pnpm drizzle-kit push` (dev only, migrations validated in Task 26).
- [ ] **Security note:** every PII column stored as envelope-encrypted bytea. No plaintext columns beyond `country` and timestamps.
- [ ] **Commit:** `feat(postgres): add identities + verification_sessions Drizzle schema`.
- [ ] **GitHub issue:** `[Fase 1] Task 24 — Postgres: identities + verifications` · labels `phase/1,scope/postgres,type/feat,security/pii`.

---

## Task 25 — PostgreSQL schema: sanctions_matches + sanctions_list_entries

**Files:** `packages/adapter-postgres/src/schema/{sanctions-matches,sanctions-list-entries}.ts`.

- [ ] `sanctions_list_entries` table:
  ```ts
  export const sanctionsListEntries = pgTable("sanctions_list_entries", {
    id: uuid("id").primaryKey().defaultRandom(),
    listSource: text("list_source").notNull(),           // OFAC_SDN, UN_CONSOLIDATED, EU_CONSOLIDATED
    listEntryId: text("list_entry_id").notNull(),        // source-assigned ID
    name: text("name").notNull(),
    aliases: text("aliases").array().notNull().default(sql`ARRAY[]::text[]`),
    dob: text("dob"),
    addresses: jsonb("addresses").$type<Array<{country: string; line: string}>>().default([]),
    programs: text("programs").array().default(sql`ARRAY[]::text[]`),
    rawPayload: jsonb("raw_payload"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull(),
  }, (t) => ({
    uqEntry: uniqueIndex("uq_list_entry").on(t.listSource, t.listEntryId),
    ginAliases: index("idx_aliases_gin").using("gin", t.aliases),
    nameTrgm: index("idx_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`)
  }));
  ```
- [ ] `sanctions_matches` table: `id`, `subject_kind`, `subject_id`, `list_source`, `list_entry_id`, `matched_name`, `matched_fields text[]`, `confidence numeric(5,2)`, `review_status`, `reviewer_user_id`, `reviewed_at`, `notes_ciphertext`, `detected_at`. Index `(subject_id, review_status)`.
- [ ] Add `CREATE EXTENSION pg_trgm` to pre-migration SQL (for trigram index).
- [ ] Generate migration `0002_sanctions.sql`.
- [ ] **Commit:** `feat(postgres): add sanctions_list_entries + sanctions_matches schema`.
- [ ] **GitHub issue:** `[Fase 1] Task 25 — Postgres: sanctions tables` · labels `phase/1,scope/postgres,type/feat`.

---

## Task 26 — PostgreSQL schema: audit_log (append-only) + idempotency

**Files:** `packages/adapter-postgres/src/schema/{audit-log,idempotency}.ts` + migration with triggers.

- [ ] `audit_log` table:
  ```sql
  CREATE TABLE audit_log (
    seq_number BIGSERIAL PRIMARY KEY,
    prev_hash  char(64) NOT NULL,
    hash       char(64) NOT NULL UNIQUE,
    event_type text     NOT NULL,
    actor_kind text     NOT NULL,
    actor_id   text     NOT NULL,
    subject_kind text,
    subject_id uuid,
    payload    jsonb    NOT NULL,
    occurred_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_audit_subject ON audit_log(subject_id) WHERE subject_id IS NOT NULL;
  CREATE INDEX idx_audit_event_type ON audit_log(event_type);
  CREATE INDEX idx_audit_occurred_at ON audit_log(occurred_at);
  ```
- [ ] Write PostgreSQL trigger that rejects `UPDATE` and `DELETE` on `audit_log`:
  ```sql
  CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
  BEGIN
    RAISE EXCEPTION 'audit_log is append-only (attempted % on row %)', TG_OP, OLD.seq_number;
  END; $$ LANGUAGE plpgsql;
  CREATE TRIGGER trg_audit_log_no_update BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
  CREATE TRIGGER trg_audit_log_no_delete BEFORE DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
  ```
- [ ] `idempotency` table: `key text PRIMARY KEY`, `response jsonb`, `expires_at timestamptz`, `created_at timestamptz`. Index on `expires_at` for cleanup cron.
- [ ] Integration test (`audit-log.integration.test.ts`): connect to dockerized postgres, insert event, attempt UPDATE → expect failure with message `audit_log is append-only`.
- [ ] Generate migration `0003_audit_idempotency.sql`.
- [ ] **Commit:** `feat(postgres): append-only audit_log with UPDATE/DELETE triggers + idempotency`.
- [ ] **GitHub issue:** `[Fase 1] Task 26 — Postgres: audit_log + triggers` · labels `phase/1,scope/postgres,type/feat,security/audit,priority/p0`.

---

## Task 27 — VerificationRepository implementation

**Files:** `packages/adapter-postgres/src/repositories/verification-repository.ts` + test.

- [ ] Implement `VerificationRepositoryPort` with Drizzle queries.
- [ ] Envelope encryption helper `crypto/envelope.ts`:
  ```ts
  export async function encryptPII(plaintext: string, dek: Buffer): Promise<{ ciphertext: Buffer; iv: Buffer; authTag: Buffer }> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return { ciphertext, iv, authTag: cipher.getAuthTag() };
  }
  ```
- [ ] Repository reads DEK via `SecretsStorePort.get(\`identities/\${subjectId}/dek\`)` — in Fase 1 we seed one DEK per subject at create time; lazy re-wrap on access.
- [ ] Integration test against dockerized Postgres:
  - Save identity → retrieve → fullName unredacted value matches original.
  - Row in DB has `full_name_ciphertext` that does NOT contain the plaintext (byte scan assertion).
  - Save session → list by subject → order by `initiated_at desc`.
- [ ] Run `docker compose up postgres -d && pnpm test --filter adapter-postgres`.
- [ ] **Commit:** `feat(postgres): implement VerificationRepository with envelope encryption`.
- [ ] **GitHub issue:** `[Fase 1] Task 27 — VerificationRepository` · labels `phase/1,scope/postgres,type/feat,security/pii,priority/p0`.

---

## Task 28 — SanctionsRepository implementation

**Files:** `packages/adapter-postgres/src/repositories/sanctions-repository.ts` + test.

- [ ] Implement CRUD for `sanctions_list_entries` and `sanctions_matches`.
- [ ] `bulkUpsert(entries: SanctionsListEntry[])` using `INSERT ... ON CONFLICT (list_source, list_entry_id) DO UPDATE`.
- [ ] `searchByNameFuzzy(query: string, threshold: number)` using trigram `%` operator with threshold.
- [ ] `searchByAlias(query: string)` using GIN index.
- [ ] Integration test: load 100 sample OFAC entries, query `"Putin"` → returns the expected entry.
- [ ] **Commit:** `feat(postgres): implement SanctionsRepository with trigram + alias search`.
- [ ] **GitHub issue:** `[Fase 1] Task 28 — SanctionsRepository` · labels `phase/1,scope/postgres,type/feat`.

---

## Task 29 — AuditLogRepository implementation

**Files:** `packages/adapter-postgres/src/repositories/audit-log-repository.ts` + test.

- [ ] Implement `AuditLogPort`:
  - `append(event)`: wrap in transaction, `SELECT seq_number, hash FROM audit_log ORDER BY seq_number DESC LIMIT 1 FOR UPDATE`, compute new hash via `AuditChainService`, INSERT. Uses advisory lock `pg_advisory_xact_lock(hashtext('audit_log'))` to serialize appends across pods.
  - `verify(fromSeq, toSeq)`: stream events with server-side cursor (Drizzle `db.transaction(tx => tx.execute(sql\`DECLARE c CURSOR FOR ... ; FETCH 1000 FROM c\`))`), run `AuditChainService.verify` incrementally.
  - `export(period)`: async iterable using server-side cursor.
  - `stream(fromSeq)`: poll-based stream (every 500ms) — NOTIFY/LISTEN promoted to Fase 2.
- [ ] Integration test:
  - Append 100 events concurrently from 4 workers → all succeed, chain is intact.
  - Manually UPDATE via superuser bypassing trigger (test uses raw query in test-only role that can disable triggers) → `verify` returns `{ ok: false, brokenAt: N }`.
  - Restore original row, `verify` returns `{ ok: true }`.
- [ ] **Commit:** `feat(postgres): implement AuditLogRepository with advisory lock + cursor export`.
- [ ] **GitHub issue:** `[Fase 1] Task 29 — AuditLogRepository` · labels `phase/1,scope/postgres,type/feat,security/audit,priority/p0`.

---

## Task 30 — ProviderCredentialVault (Vault adapter + sealed-secrets loader)

**Files:** `packages/adapter-vault/src/{vault-credential-vault,sealed-secrets-loader}.ts` + test.

- [ ] Implement `VaultCredentialVault` using `node-vault`:
  ```ts
  export class VaultCredentialVault implements ProviderCredentialVault {
    constructor(private readonly client: VaultClient, private readonly logger: LoggerPort) {}
    async loadCredentials(tenantId: string, provider: ProviderCode): Promise<ProviderCredentials> {
      const path = `compliance/${tenantId}/providers/${provider}`;
      const secret = await this.client.read(path);
      if (!secret?.data?.data) throw new CredentialNotFound(path);
      return ProviderCredentials.fromVault(secret.data.data);
    }
    async rotate(tenantId: string, provider: ProviderCode): Promise<void> { await this.client.write(`${path}/rotate`, {}); }
  }
  ```
- [ ] `ProviderCredentials`: wraps secret value in a `Disposable` object. `using creds = await vault.loadCredentials(...)` pattern. After scope exit, buffers are zeroed.
- [ ] `SealedSecretsLoader`: for K8s deployments, reads from mounted sealed-secrets projected volume `/run/secrets/compliance/<provider>` and exposes same interface.
- [ ] Config choice via env: `VAULT_MODE=vault|sealed-secrets|memory` (memory only in tests).
- [ ] Integration test against dockerized Vault dev mode.
- [ ] **Security note:**
  - No credentials in logs.
  - Error messages reference the vault path but not the secret.
  - Buffer zeroing after dispose verified via a custom assertion that inspects the wrapping class.
- [ ] **Commit:** `feat(vault): implement Vault + sealed-secrets credential loaders with Disposable wrappers`.
- [ ] **GitHub issue:** `[Fase 1] Task 30 — ProviderCredentialVault` · labels `phase/1,scope/vault,type/feat,security/credentials,priority/p0`.

---

## Task 31 — PersonaAdapter: client + DTO layer

**Files:** `packages/adapter-persona/src/{persona-client,dto}.ts` + test with MSW mocks.

- [ ] Install `@withpersona/persona-sdk-js` (if official) OR implement thin HTTP client (plain `undici`) targeting `https://api.withpersona.com/api/v1/`. Fase 1 uses the direct HTTP client to keep control of retries and redaction.
- [ ] Endpoints used:
  - `POST /inquiries` with body `{ data: { attributes: { inquiry-template-id, fields: {...} } } }` → returns inquiry object with `id`, `attributes.status`, `attributes.reference-id`.
  - `GET /inquiries/{id}` → status polling.
  - `GET /inquiries/{id}/verifications` → evidence list (docs, selfie, OCR extracted fields).
- [ ] Client injects `Authorization: Bearer <api-key>` via `ProviderCredentialVault`, never from env.
- [ ] DTOs parsed via zod schemas — unknown fields rejected in dev, stripped in prod.
- [ ] Retry: exponential backoff with jitter on 429/502/503/504; respect `X-RateLimit-Reset`.
- [ ] Tests with MSW intercepting `api.withpersona.com`:
  - Happy path: `createInquiry` returns parsed object.
  - 401 → `ProviderError(code=UNAUTHENTICATED, isRetryable=false)`.
  - 429 with `Retry-After: 2` → retries once, succeeds.
  - Malformed response → `ProviderError(code=PARSE_ERROR)` with no PII in message.
- [ ] **Security note:** requests logged with `{ inquiryId, statusCode, duration_ms }` only. Never log request/response bodies.
- [ ] **Commit:** `feat(persona): add HTTP client with retry + zod DTO parsing`.
- [ ] **GitHub issue:** `[Fase 1] Task 31 — Persona HTTP client` · labels `phase/1,scope/persona,type/feat,security/credentials`.

---

## Task 32 — PersonaAdapter: startVerification + getSessionStatus

**Files:** `packages/adapter-persona/src/persona-adapter.ts` + test.

- [ ] Implement `IdentityVerificationPort.startVerification`:
  ```ts
  async startVerification(input: StartInput): Promise<StartOutput> {
    using creds = await this.vault.loadCredentials(input.tenantId, "PERSONA");
    const inquiry = await this.client.createInquiry(creds.apiKey, {
      templateId: this.templateIdFor(input.kind, input.country),
      referenceId: input.sessionId,
      fields: { nameFirst: input.firstName.unsafeReveal(), nameLast: input.lastName.unsafeReveal(), birthdate: input.dob }
    });
    return { providerSessionId: inquiry.id, hostedFlowUrl: `https://withpersona.com/verify?inquiry-id=${inquiry.id}`, expiresAt: addMinutes(now, 60) };
  }
  ```
- [ ] `getSessionStatus(id)`: polls inquiry, maps Persona statuses (`created`, `pending`, `completed`, `failed`, `expired`) to domain `VerificationStatus`.
- [ ] Template mapping table per country (CR, MX, CO) with fallback to global template.
- [ ] Tests:
  - Happy path with MSW.
  - Persona returns `expired` → domain status `EXPIRED`.
  - Inquiry template not found → `ProviderError(code=CONFIG_ERROR)`.
- [ ] **Security note:** `unsafeReveal()` call sites audited. After `using creds`, credential buffer zeroed.
- [ ] **Commit:** `feat(persona): implement startVerification + getSessionStatus`.
- [ ] **GitHub issue:** `[Fase 1] Task 32 — Persona start/status` · labels `phase/1,scope/persona,type/feat,security/pii,priority/p0`.

---

## Task 33 — PersonaAdapter: fetchEvidence

**Files:** `packages/adapter-persona/src/persona-adapter.ts` (extend) + test.

- [ ] Implement `fetchEvidence(providerSessionId)`:
  - GET `/inquiries/{id}/verifications` → list of verifications (document, selfie, database).
  - For each, fetch any attached file via signed URL → stream to S3/MinIO (Fase 1 uses local fs as fallback with `EVIDENCE_STORE_BASE`).
  - Return `EvidenceBundle` with pointers + provider score + OCR extracted fields (wrapped in `PIIString`).
- [ ] Test: MSW returns fixture verifications JSON + synthetic file; assert file is written, bundle has URIs, no raw bytes in return value.
- [ ] **Security note:** evidence files encrypted with per-subject DEK before write. Filenames contain only UUIDs. Retention metadata attached.
- [ ] **Commit:** `feat(persona): implement fetchEvidence with encrypted blob storage`.
- [ ] **GitHub issue:** `[Fase 1] Task 33 — Persona fetchEvidence` · labels `phase/1,scope/persona,type/feat,security/pii`.

---

## Task 34 — PersonaAdapter: webhook verifier (HMAC + timestamp tolerance)

**Files:** `packages/adapter-persona/src/webhook-verifier.ts` + test.

- [ ] Implement `verifyPersonaSignature(headers, rawBody, secret)`:
  ```ts
  const header = headers["persona-signature"] ?? headers["Persona-Signature"];
  if (!header) throw new WebhookSignatureInvalid("missing");
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=")));
  const t = parts.t; const v1 = parts.v1;
  if (!t || !v1) throw new WebhookSignatureInvalid("malformed");
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(t)) > 300) throw new WebhookSignatureInvalid("timestamp-out-of-tolerance");
  const payload = `${t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) throw new WebhookSignatureInvalid("bad-signature");
  ```
- [ ] Tests:
  - Valid signature → passes.
  - Missing header → `WebhookSignatureInvalid("missing")`.
  - Tampered body → rejected.
  - Timestamp 10 minutes old → rejected.
  - Replay of same `(t, v1)` pair → rejected by idempotency (test with in-memory idempotency port).
- [ ] **Security note:** secret loaded via `SecretsStorePort`, not env. Error codes never reveal secret bytes. `timingSafeEqual` required to prevent timing attacks.
- [ ] **Commit:** `feat(persona): implement webhook HMAC verifier with replay protection`.
- [ ] **GitHub issue:** `[Fase 1] Task 34 — Persona webhook verifier` · labels `phase/1,scope/persona,type/feat,security/credentials,priority/p0`.

---

## Task 35 — PersonaAdapter: webhook handler wiring + idempotency

**Files:** `packages/adapter-persona/src/persona-adapter.ts` (extend) — exposed as `handleWebhook(request)`.

- [ ] `handleWebhook`:
  1. Read raw body (preserve bytes — Fastify `rawBody: true`).
  2. Load webhook secret via `SecretsStorePort.get("persona/webhook-secret")`.
  3. Verify signature.
  4. Parse event: `inquiry.completed`, `inquiry.failed`, `inquiry.expired`, `inquiry.marked-for-review`.
  5. Idempotency key: `persona:webhook:${event.id}` via `IdempotencyPort`.
  6. Translate to `CompleteVerification` command and invoke it.
  7. Return `{ ok: true }` with 200.
- [ ] Tests with MSW + in-memory idempotency:
  - Same webhook delivered 3 times → command invoked once.
  - Unknown event type → 200 OK, audit log records `WebhookIgnored`.
- [ ] **Commit:** `feat(persona): wire webhook handler with idempotency + command invocation`.
- [ ] **GitHub issue:** `[Fase 1] Task 35 — Persona webhook handler` · labels `phase/1,scope/persona,type/feat,security/credentials,priority/p0`.

---

## Task 36 — PersonaAdapter: rate-limit + circuit breaker

**Files:** `packages/adapter-persona/src/persona-adapter.ts` (wrap client).

- [ ] Install `opossum` for circuit breaker.
- [ ] Wrap each Persona API call in a `CircuitBreaker` with: `timeout=15s`, `errorThresholdPercentage=50`, `resetTimeout=30s`.
- [ ] Rate limit: token bucket respecting `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers; emit metric `compliance_provider_rate_limit_remaining{provider="PERSONA"}`.
- [ ] When breaker OPEN, emit event `ProviderDegraded` + metric `compliance_provider_circuit_breaker_state{provider="PERSONA"}=2`.
- [ ] Tests: simulate 10 consecutive 500s → breaker opens, 11th call short-circuits with `ProviderError(code=CIRCUIT_OPEN)`.
- [ ] **Commit:** `feat(persona): add circuit breaker + rate-limit awareness`.
- [ ] **GitHub issue:** `[Fase 1] Task 36 — Persona resilience` · labels `phase/1,scope/persona,type/feat`.

---

## Task 37 — PersonaAdapter: quickCheck stub

**Files:** `packages/adapter-persona/src/persona-adapter.ts` (extend).

- [ ] Implement `quickCheck(receiverId)` as a thin stub that returns `{ status: "STUB", message: "QuickCheck lands in Fase 2" }` and logs once at startup that this path is stub-only. This satisfies the spec §5 requirement for v1 stub while leaving no ambiguity.
- [ ] Test: returns stub response and emits `compliance_quickcheck_stub_total` metric.
- [ ] **Commit:** `feat(persona): add quickCheck stub (real impl in Fase 2)`.
- [ ] **GitHub issue:** `[Fase 1] Task 37 — quickCheck stub` · labels `phase/1,scope/persona,type/feat`.

---

## Task 38 — PersonaAdapter: end-to-end integration test

**Files:** `packages/adapter-persona/test/e2e.test.ts`.

- [ ] Scenario (all in-memory ports + MSW):
  1. Invoke `StartVerification` command.
  2. Assert `VerificationSession` in `PENDING`, audit event appended.
  3. Simulate Persona webhook `inquiry.completed` → signed request.
  4. Assert `CompleteVerification` invoked, session `VERIFIED`, evidence fetched, second audit event, chain verifies.
  5. Replay same webhook → no duplicate events, idempotency hit metric increments.
- [ ] Run `pnpm test --filter adapter-persona`.
- [ ] **Commit:** `test(persona): add end-to-end verification lifecycle test`.
- [ ] **GitHub issue:** `[Fase 1] Task 38 — Persona E2E test` · labels `phase/1,scope/persona,type/test,priority/p0`.

---

## Task 39 — OndatoAdapter: client skeleton + auth

**Files:** `packages/adapter-ondato/src/{ondato-client,dto}.ts` + test.

- [ ] Thin HTTP client targeting `https://api.ondato.com/` (paths per Ondato docs — age verification, KYB endpoints reserved but not implemented).
- [ ] Auth: OAuth2 client credentials flow → bearer token cached for 1h.
- [ ] Credentials via `ProviderCredentialVault`.
- [ ] Test MSW: token endpoint + echo endpoint.
- [ ] **Commit:** `feat(ondato): add HTTP client skeleton with OAuth2`.
- [ ] **GitHub issue:** `[Fase 1] Task 39 — Ondato client skeleton` · labels `phase/1,scope/ondato,type/feat`.

---

## Task 40 — OndatoAdapter: age verification endpoint wiring

**Files:** `packages/adapter-ondato/src/ondato-adapter.ts` + test.

- [ ] Implement `IdentityVerificationPort.startVerification` for `kind=AGE` only.
- [ ] Other kinds throw `ProviderError(code=NOT_SUPPORTED_IN_FASE_1, isRetryable=false)`.
- [ ] Minimal flow: create Ondato age verification session → return hosted URL.
- [ ] Test: happy path + not-supported path.
- [ ] **Commit:** `feat(ondato): wire AGE verification (other kinds return NOT_SUPPORTED_IN_FASE_1)`.
- [ ] **GitHub issue:** `[Fase 1] Task 40 — Ondato age verification` · labels `phase/1,scope/ondato,type/feat`.

---

## Task 41 — OndatoAdapter: secondary selection logic

**Files:** `packages/adapter-ondato/src/index.ts` (re-export) + composition wiring docs.

- [ ] Document: composition root selects Persona as primary for `kind=KYC_*`, Ondato for `kind=AGE`, and fails for any other kind in Fase 1 with clear error code `NOT_SUPPORTED_IN_FASE_1`.
- [ ] Write `docs/adapters/ondato.md` describing stub coverage + Fase 2 roadmap (KYB + authentication solutions).
- [ ] **Commit:** `docs(ondato): document Fase 1 scope + Fase 2 deferral of KYB`.
- [ ] **GitHub issue:** `[Fase 1] Task 41 — Ondato scope docs` · labels `phase/1,scope/ondato,scope/docs,type/docs`.

---

## Task 42 — OndatoAdapter: webhook handler skeleton

**Files:** `packages/adapter-ondato/src/webhook-verifier.ts` (skeleton).

- [ ] Verifier reads `X-Ondato-Signature` HMAC-SHA256 header. Implementation mirrors Persona's verifier shape.
- [ ] Handler today only processes `age-verification.completed`; other event types return 202 Accepted and log `ondato.webhook.ignored` with event type (no PII).
- [ ] Test: valid age-verification webhook routes to `CompleteVerification` with kind=AGE.
- [ ] **Commit:** `feat(ondato): webhook verifier + age-verification handler (others ignored)`.
- [ ] **GitHub issue:** `[Fase 1] Task 42 — Ondato webhook skeleton` · labels `phase/1,scope/ondato,type/feat,security/credentials`.

---

## Task 43 — OFAC SDN feed: downloader

**Files:** `packages/adapter-ofac/src/downloader.ts` + test.

- [ ] Implement downloader for `https://www.treasury.gov/ofac/downloads/sdn.xml` (and alt `https://sanctionslist.ofac.treas.gov/Home/ConsolidatedList`).
- [ ] Strategy: GET with `If-Modified-Since` header; cache ETag + Last-Modified in a `ofac_feed_metadata` row.
- [ ] Stream to disk under `/tmp/compliance/ofac/sdn-${timestamp}.xml` with atomic rename after complete.
- [ ] Emit metric `compliance_ofac_download_bytes_total`, `compliance_ofac_download_duration_seconds`.
- [ ] Test with MSW: serves fixture XML, assert 200 + file on disk; serves 304 → no file written.
- [ ] **Commit:** `feat(ofac): implement SDN XML downloader with If-Modified-Since`.
- [ ] **GitHub issue:** `[Fase 1] Task 43 — OFAC downloader` · labels `phase/1,scope/ofac,type/feat`.

---

## Task 44 — OFAC SDN feed: XML parser (fast-xml-parser)

**Files:** `packages/adapter-ofac/src/xml-parser.ts`, `packages/adapter-ofac/src/fixtures/sdn-sample.xml` + test.

- [ ] Create fixture `sdn-sample.xml` with 15 entries (trimmed from real OFAC SDN): mix of INDIVIDUALS + ENTITIES, include one with multiple aliases, one with DOB, one with Cyrillic name requiring transliteration.
- [ ] Implement `parseSdnXml(path): AsyncIterable<SanctionsListEntry>`:
  ```ts
  import { XMLParser } from "fast-xml-parser";
  import { createReadStream } from "node:fs";
  import { Readable } from "node:stream";
  export async function* parseSdnXml(path: string): AsyncIterable<SanctionsListEntry> {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: true });
    const xml = await readFile(path, "utf8");
    const root = parser.parse(xml);
    for (const entry of root.sdnList.sdnEntry ?? []) {
      yield {
        listSource: "OFAC_SDN",
        listEntryId: String(entry.uid),
        name: `${entry.lastName ?? ""}, ${entry.firstName ?? ""}`.trim().replace(/^,\s*/, ""),
        aliases: Array.isArray(entry.akaList?.aka) ? entry.akaList.aka.map((a: any) => `${a.lastName ?? ""} ${a.firstName ?? ""}`.trim()) : [],
        dob: entry.dateOfBirthList?.dateOfBirthItem?.dateOfBirth,
        addresses: normalizeAddresses(entry.addressList?.address),
        programs: Array.isArray(entry.programList?.program) ? entry.programList.program : [entry.programList?.program].filter(Boolean),
        rawPayload: entry
      };
    }
  }
  ```
- [ ] Tests:
  - Parses 15 entries from fixture, no throws.
  - Cyrillic name → transliteration normalizes to Latin (use `transliteration` package).
  - Entry without DOB → `dob` is undefined.
  - Malformed XML → throws `OfacParseError` with no raw payload in message.
- [ ] Golden snapshot test: parse fixture, snapshot result; CI fails if output drifts.
- [ ] **Commit:** `feat(ofac): implement SDN XML parser with transliteration`.
- [ ] **GitHub issue:** `[Fase 1] Task 44 — OFAC parser` · labels `phase/1,scope/ofac,type/feat,priority/p0`.

---

## Task 45 — OFAC SDN feed: store + upsert into sanctions_list_entries

**Files:** `packages/adapter-ofac/src/ingester.ts` + integration test.

- [ ] Implement `ingest(path: string, repo: SanctionsRepository): Promise<RefreshReport>`:
  - Streams parsed entries.
  - Chunks of 500 → `bulkUpsert`.
  - Detects removals: entries present in DB (`listSource=OFAC_SDN`) but absent in current feed → marked as `retired_at=now()` (add column to schema) OR delete with audit log entry. **Fase 1 choice: soft-delete with `retired_at` column.**
  - Returns `{ added, updated, retired, total, durationMs, listChecksum }`.
  - Appends `ListRefreshed` audit event.
- [ ] Add `retired_at timestamptz` column to `sanctions_list_entries`; migration `0004_list_retirement.sql`.
- [ ] Integration test (Postgres + fixture): fresh DB → 15 entries added; mutate fixture (remove 3 entries) → re-run → `retired=3`, `added=0`, `updated=12`.
- [ ] **Commit:** `feat(ofac): implement feed ingester with upsert + soft-delete + audit event`.
- [ ] **GitHub issue:** `[Fase 1] Task 45 — OFAC ingester` · labels `phase/1,scope/ofac,type/feat,priority/p0`.

---

## Task 46 — OFACFeedAdapter: daily cron

**Files:** `packages/server/src/crons/refresh-sanctions.ts` + test.

- [ ] Implement cron using `node-cron` with schedule `0 6 * * *` (06:00 UTC daily).
- [ ] On startup, checks `sanctions_list_freshness` (timestamp of last successful refresh); if > 26h, triggers immediate refresh in addition to the cron.
- [ ] Exposes manual trigger endpoint via `ComplianceScreening.RefreshSanctionsLists` RPC (Task 55).
- [ ] Cron emits metrics: `compliance_list_refresh_total{list, result}`, `compliance_list_freshness_seconds{list}`.
- [ ] On failure, alert by emitting event `ProviderDegraded{provider=OFAC}` and logging with `correlation_id` (no payload).
- [ ] Test with fake clock + fake repo: advance 26h → cron triggers.
- [ ] **Commit:** `feat(server): add daily cron for OFAC refresh with catch-up on stale state`.
- [ ] **GitHub issue:** `[Fase 1] Task 46 — OFAC cron` · labels `phase/1,scope/ofac,type/feat`.

---

## Task 47 — SanctionsScreeningPort: screen() implementation

**Files:** `packages/adapter-ofac/src/screening.ts` + tests.

- [ ] Implement `SanctionsScreeningAdapter` that wraps `MatchNormalizer` + `SanctionsRepository`:
  ```ts
  async screen(subject: IdentityOrBusiness): Promise<SanctionsMatch[]> {
    const query = { fullName: subject.fullName.unsafeReveal(), dob: subject.dateOfBirth };
    const candidates = await this.repo.searchByNameFuzzy(query.fullName, /* threshold */ 0.3);
    return candidates
      .map(c => ({ candidate: c, score: this.normalizer.score(query, { fullName: c.name, aliases: c.aliases, dob: c.dob }) }))
      .filter(x => x.score >= this.config.matchThreshold)
      .map(x => SanctionsMatch.create({ subject: { kind: "IDENTITY", id: subject.id }, listSource: x.candidate.listSource, matchedEntry: { listEntryId: x.candidate.listEntryId, name: x.candidate.name, aliases: x.candidate.aliases, matchedFields: fieldsMatched(query, x.candidate) }, confidence: x.score }));
  }
  ```
- [ ] Threshold configurable per tenant (default 80).
- [ ] Tests:
  - Fixture identity `"Vladimir Putin"` → matches OFAC entry from fixture, confidence ≥ 85.
  - `"Mario Lopez"` → no matches.
  - Known false-positive fixture `"Carlos Pérez"` vs OFAC entry `"Pérez, Carlos"` but different DOB → filtered out by DOB mismatch.
- [ ] Precision + recall computed over `__fixtures__/sanctions-golden.json` (30 cases): asserts ≥ 0.95 each.
- [ ] **Commit:** `feat(ofac): implement SanctionsScreeningPort.screen with fuzzy matcher`.
- [ ] **GitHub issue:** `[Fase 1] Task 47 — Sanctions screen()` · labels `phase/1,scope/ofac,type/feat,priority/p0`.

---

## Task 48 — SanctionsScreeningPort: resolveMatch + getMatch

**Files:** `packages/adapter-ofac/src/screening.ts` (extend) + test.

- [ ] Implement `resolveMatch(id, resolution)`:
  - Loads match, transitions via `SanctionsMatch.confirm()` or `.markFalsePositive()`.
  - Persists.
  - Appends audit event `SanctionsMatchResolved`.
- [ ] Implement `getMatch(id)`.
- [ ] Tests: confirm, falsePositive, double-resolve → `AlreadyReviewed`.
- [ ] **Commit:** `feat(ofac): add resolveMatch + getMatch with audit events`.
- [ ] **GitHub issue:** `[Fase 1] Task 48 — Sanctions resolve` · labels `phase/1,scope/ofac,type/feat`.

---

## Task 49 — AuditLogPort: append operation (wire in AuditLogRepository)

**Files:** uses existing `packages/adapter-postgres/src/repositories/audit-log-repository.ts` — this task wires it into the composition root with `AuditChainService`.

- [ ] Composition root instantiates `AuditLogRepository` with `AuditChainService`.
- [ ] Append flow: acquire advisory lock → read tail → compute hash via chain service → INSERT → release lock.
- [ ] Contention test: 8 concurrent workers appending 100 events each → final chain verifies, seq numbers are 1..800, no gaps, no duplicates.
- [ ] **Commit:** `feat(audit): wire AuditLogRepository with AuditChainService in composition root`.
- [ ] **GitHub issue:** `[Fase 1] Task 49 — Audit append wiring` · labels `phase/1,scope/postgres,type/feat,security/audit,priority/p0`.

---

## Task 50 — AuditLogPort: verify + integrity cron

**Files:** `packages/server/src/crons/verify-audit-chain.ts` + test.

- [ ] Cron schedule `15 * * * *` (every hour at :15). Verifies chain since last checkpoint stored in `audit_integrity_checkpoints` table (new migration).
- [ ] On `IntegrityBroken`, immediately:
  - Emits `AuditIntegrityBroken` domain event.
  - Sets metric `compliance_audit_integrity_checks_total{result="broken"}` += 1.
  - Writes critical log entry.
  - Invokes `WritesFreezer.freeze()` (in-memory flag consulted by command middleware; commands that touch audit log return 503 until manual unfreeze).
- [ ] Tests:
  - Clean chain → cron records success, checkpoint advances.
  - Inject tampering → cron detects, freeze engaged, integrity event emitted.
- [ ] **Commit:** `feat(audit): add hourly integrity cron + write freeze on break`.
- [ ] **GitHub issue:** `[Fase 1] Task 50 — Audit integrity cron` · labels `phase/1,scope/postgres,type/feat,security/audit,priority/p0`.

---

## Task 51 — AuditLogPort: export operation

**Files:** `packages/adapter-postgres/src/repositories/audit-log-repository.ts` (extend) + test.

- [ ] `export(period)` returns `AsyncIterable<ComplianceEvent>` backed by server-side cursor for memory safety on large ranges (7-year retention can mean millions of events).
- [ ] `exportSigned(period): Promise<ForensicBundle>` produces a ZIP with:
  - `events.ndjson` — events.
  - `chain-verify.json` — integrity result.
  - `manifest.json` — metadata (period, count, chainHeadHash, softwareVersion).
  - `signature.sig` — Ed25519 signature over `manifest.json` using key loaded from `SecretsStorePort.get("audit/export-signing-key")`.
- [ ] Test: export last 10 events → ZIP opens, manifest valid, signature verifies with public key, chain verification result embedded.
- [ ] **Commit:** `feat(audit): implement signed forensic export with Ed25519 manifest signature`.
- [ ] **GitHub issue:** `[Fase 1] Task 51 — Audit export` · labels `phase/1,scope/postgres,type/feat,security/audit`.

---

## Task 52 — AuditLogPort: contract test suite

**Files:** `packages/core/src/app/ports/__contract__/audit-log.ts` + test runner.

- [ ] Contract suite that any adapter must pass:
  1. Append 1000 events → seq numbers strictly monotonic from 1.
  2. Verify full range → OK.
  3. Append after verify → chain continues correctly.
  4. Inject tampering → verify detects at exact position.
  5. Export → iterates all events in order.
  6. Concurrent appends (8 workers × 100 events) → no duplicates, verify OK.
- [ ] Run contract against Postgres adapter in Postgres integration test.
- [ ] Run contract against in-memory adapter (for testing handlers).
- [ ] **Commit:** `test(audit): add portable contract suite for AuditLogPort implementations`.
- [ ] **GitHub issue:** `[Fase 1] Task 52 — Audit contract tests` · labels `phase/1,scope/postgres,type/test,security/audit`.

---

## Task 53 — gRPC server: bootstrap + composition root

**Files:** `packages/server/src/grpc/server.ts`, `packages/server/src/composition/{wire,config}.ts`.

- [ ] `config.ts`: zod-validated env config. Required: `DATABASE_URL`, `VAULT_ADDR`, `VAULT_TOKEN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `GRPC_PORT`, `REST_PORT`, `LOG_LEVEL`, `TENANT_ID` (single-tenant v1), `SANCTIONS_MATCH_THRESHOLD=80`.
- [ ] `wire.ts`: instantiates adapters, wires ports, returns `{ commands, queries, adapters, shutdown }`.
- [ ] `server.ts`: creates `@grpc/grpc-js` server, registers interceptor chain, binds to `:50071`, awaits `SIGTERM` for graceful shutdown (drain inflight calls, close DB, flush OTel).
- [ ] Smoke test: boot server on random port, call unimplemented RPC, get `UNIMPLEMENTED` response.
- [ ] **Commit:** `feat(server): bootstrap gRPC server + DI composition root`.
- [ ] **GitHub issue:** `[Fase 1] Task 53 — gRPC bootstrap` · labels `phase/1,scope/grpc,type/feat,priority/p0`.

---

## Task 54 — gRPC interceptors: tracing + auth + PII redaction

**Files:** `packages/server/src/grpc/interceptors/*.ts`.

- [ ] `tracing.ts`: starts OTel span per RPC, attaches `rpc.service`, `rpc.method`, `correlation_id`. Reads `traceparent` header.
- [ ] `auth.ts`: mTLS peer cert OR JWT bearer. Single-tenant v1 — validates that `sub` claim matches `TENANT_ID`.
- [ ] `redaction.ts`: walks request/response, redacts any field annotated `(compliance.pii) = true` before it is logged. Uses proto descriptor introspection.
- [ ] Tests: invoke with + without auth; invoke request with PII field → log stream does not contain raw value.
- [ ] **Commit:** `feat(grpc): add tracing + auth + PII-redacting interceptors`.
- [ ] **GitHub issue:** `[Fase 1] Task 54 — gRPC interceptors` · labels `phase/1,scope/grpc,type/feat,security/pii`.

---

## Task 55 — gRPC services: ComplianceAdmin + ComplianceScreening

**Files:** `packages/server/src/grpc/services/{admin,screening}.ts` + integration test.

- [ ] Implement Admin service: `StartVerification`, `GetVerificationStatus`, `ListVerifications` (server-streaming), `VerifyAge`, `QuickCheck`, `VerifyBusiness` (UNIMPLEMENTED), `RequestProofOfPersonhood` (UNIMPLEMENTED), `VerifyProofOfPersonhood` (UNIMPLEMENTED).
- [ ] Implement Screening: `ScreenSanctions`, `ResolveMatch`, `RefreshSanctionsLists`, `GetRiskScore` (stub: returns LOW for Fase 1), `ScreenPEP` (UNIMPLEMENTED), `ScreenAdverseMedia` (UNIMPLEMENTED).
- [ ] Integration test: grpc-js client calls `StartVerification` end-to-end; stubbed adapters produce `VerificationSessionAck`.
- [ ] **Commit:** `feat(grpc): implement ComplianceAdmin + ComplianceScreening services`.
- [ ] **GitHub issue:** `[Fase 1] Task 55 — Admin + Screening services` · labels `phase/1,scope/grpc,type/feat,priority/p0`.

---

## Task 56 — gRPC services: ComplianceAudit + ComplianceHealth

**Files:** `packages/server/src/grpc/services/{audit,health}.ts` + test.

- [ ] Implement `ComplianceAudit.AppendEvent`, `VerifyIntegrity`, `ExportAuditLog` (server-stream).
- [ ] Implement `ComplianceHealth`: `GetProviderHealth` reports Persona/Ondato breaker state + latency p95; `GetListFreshness` reports OFAC last refresh age; `GetCircuitBreakerState` granular per provider.
- [ ] Tests: end-to-end export of 100 events via streaming — assert chain verifies on the receiving side.
- [ ] **Commit:** `feat(grpc): implement ComplianceAudit + ComplianceHealth services`.
- [ ] **GitHub issue:** `[Fase 1] Task 56 — Audit + Health services` · labels `phase/1,scope/grpc,type/feat,security/audit`.

---

## Task 57 — gRPC services: ComplianceAML + ComplianceWhistle stubs

**Files:** `packages/server/src/grpc/services/{aml,whistle}.ts`.

- [ ] Every RPC returns `Status.UNIMPLEMENTED` with message `"This RPC lands in Fase 2 or 3 — see compliance-core roadmap"`.
- [ ] Emit metric `compliance_rpc_unimplemented_total{service, method}`.
- [ ] Test: each RPC returns expected status.
- [ ] **Commit:** `feat(grpc): register AML + Whistle services as UNIMPLEMENTED stubs`.
- [ ] **GitHub issue:** `[Fase 1] Task 57 — AML/Whistle stubs` · labels `phase/1,scope/grpc,type/feat`.

---

## Task 58 — REST (Fastify): bootstrap + OpenAPI

**Files:** `packages/server/src/rest/{fastify-app,openapi}.yaml`, `packages/server/src/rest/routes/health.ts`.

- [ ] Fastify app with plugins: `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `fastify-raw-body` (for webhooks).
- [ ] Request logger uses pino with PII redact paths.
- [ ] OpenAPI 3.1 YAML skeleton covering every REST endpoint Fase 1 exposes (admin + screening + webhooks + health).
- [ ] `GET /healthz` → `{ status: "ok" }`, `GET /readyz` → checks DB + Vault + OTel exporter.
- [ ] **Commit:** `feat(rest): bootstrap Fastify app with security plugins + OpenAPI`.
- [ ] **GitHub issue:** `[Fase 1] Task 58 — REST bootstrap` · labels `phase/1,scope/rest,type/feat`.

---

## Task 59 — REST routes: admin + screening (standalone)

**Files:** `packages/server/src/rest/routes/{admin,screening}.ts` + integration test.

- [ ] `POST /v1/verifications` → `StartVerification` command.
- [ ] `GET /v1/verifications/:id` → `GetVerificationStatus` query.
- [ ] `GET /v1/verifications?subjectId=...` → `ListVerifications`.
- [ ] `POST /v1/screening/sanctions` → `ScreenSanctions`.
- [ ] `PATCH /v1/matches/:id` → `ResolveMatch`.
- [ ] `POST /v1/sanctions-lists/refresh` → `RefreshSanctionsLists` (admin-only auth).
- [ ] Validation via zod → returns `400` with machine-readable error codes.
- [ ] Tests: supertest against in-memory composition with MSW mocking Persona.
- [ ] **Commit:** `feat(rest): implement admin + screening routes with zod validation`.
- [ ] **GitHub issue:** `[Fase 1] Task 59 — REST admin + screening` · labels `phase/1,scope/rest,type/feat`.

---

## Task 60 — REST routes: webhooks (Persona + Ondato)

**Files:** `packages/server/src/rest/routes/webhook-persona.ts`, `packages/server/src/rest/routes/webhook-ondato.ts` + test.

- [ ] `POST /v1/webhooks/persona`:
  - Uses raw body.
  - Calls `PersonaAdapter.handleWebhook`.
  - Returns 200 on verified + accepted, 401 on signature failure, 409 on idempotency replay (silent success), 500 on downstream failure (with retry-friendly body).
- [ ] `POST /v1/webhooks/ondato`: mirrored for age events.
- [ ] Tests with supertest:
  - Valid signed payload → 200 + command invoked.
  - Tampered payload → 401 + no command.
  - Replay → 200 + command invoked once.
- [ ] **Commit:** `feat(rest): implement Persona + Ondato webhook routes with HMAC + idempotency`.
- [ ] **GitHub issue:** `[Fase 1] Task 60 — Webhooks` · labels `phase/1,scope/rest,type/feat,security/credentials,priority/p0`.

---

## Task 61 — Observability: OTel tracer + metrics exporter

**Files:** `packages/adapter-otel/src/{tracer,metrics}.ts` + smoke test.

- [ ] Tracer: `@opentelemetry/sdk-node` with `OTLPTraceExporter` over HTTP → collector endpoint from env. Auto-instrumentations: `@opentelemetry/instrumentation-grpc`, `-http`, `-pg`, `-undici`.
- [ ] Metrics: `@opentelemetry/sdk-metrics` with `OTLPMetricExporter`. Also exposes Prometheus scrape endpoint at `:9464/metrics` via `@opentelemetry/exporter-prometheus`.
- [ ] Register compliance-specific metrics (listed in spec §11):
  - `compliance_verification_started_total`, `compliance_verification_completed_total`, `compliance_verification_latency_seconds`, `compliance_sanctions_match_total`, `compliance_list_freshness_seconds`, `compliance_provider_circuit_breaker_state`, `compliance_audit_chain_length`, `compliance_audit_integrity_checks_total`.
- [ ] Boot smoke test: start SDK → emit one metric + one span → assert no errors.
- [ ] **Commit:** `feat(otel): add OTel tracer + metrics exporter with Prometheus bridge`.
- [ ] **GitHub issue:** `[Fase 1] Task 61 — OTel SDK` · labels `phase/1,scope/otel,type/feat`.

---

## Task 62 — Observability: pino logger with PII redaction

**Files:** `packages/adapter-otel/src/logger.ts` + test fixtures with cédulas/passports.

- [ ] Pino logger with:
  ```ts
  export const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers['persona-signature']",
        "*.taxId",
        "*.fullName",
        "*.dateOfBirth",
        "*.documentNumber",
        "*.passportNumber",
        "*.cedula",
        "*.evidence",
        "*.webhookBody",
        "context.credentials"
      ],
      censor: "[REDACTED]"
    },
    formatters: { level: label => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime
  });
  ```
- [ ] Fixture test file `packages/adapter-otel/test/pii-redaction.test.ts`:
  - Logs object with cédula `1-1234-5678`, passport `A12345678`, full name `Luis Andres Pena Castillo`, tax ID `VECJ880326XXX`.
  - Captures log stream.
  - Asserts NONE of those strings appear in output.
  - Asserts `"[REDACTED]"` appears at each expected path.
- [ ] Trace correlation: inject `trace_id` and `span_id` via `@opentelemetry/api` pino hook.
- [ ] **Commit:** `feat(otel): add pino logger with PII redaction + trace correlation`.
- [ ] **GitHub issue:** `[Fase 1] Task 62 — Pino logger` · labels `phase/1,scope/otel,type/feat,security/pii,priority/p0`.

---

## Task 63 — Observability: Grafana dashboards JSON

**Files:** `ops/grafana/dashboards/{verification-funnel,sanctions-screening,audit-integrity,provider-health,sre-golden}.json`.

- [ ] 5 Fase 1 dashboards (remaining 2 deferred to Fase 2 once AML + whistleblower land):
  1. **Verification funnel**: started → pending → verified/failed per provider and jurisdiction.
  2. **Sanctions screening**: matches per list, confidence band heatmap, resolve-time histogram.
  3. **Audit integrity**: chain length gauge, integrity check result, time-since-last-verify.
  4. **Provider health**: Persona/Ondato/OFAC latency p95/p99, error rate, circuit breaker state.
  5. **SRE golden signals**: RPS, p95 latency, error rate, saturation.
- [ ] Dashboards are JSON with Grafana 11.x schema; include variables for `tenant` and `provider`.
- [ ] Document import instructions in `docs/operations/observability.md`.
- [ ] **Commit:** `feat(otel): add 5 Grafana dashboards (funnel, sanctions, audit, providers, SRE)`.
- [ ] **GitHub issue:** `[Fase 1] Task 63 — Grafana dashboards` · labels `phase/1,scope/otel,type/feat`.

---

## Task 64 — Observability: alerting rules

**Files:** `ops/prometheus/rules/compliance-core.yaml`.

- [ ] PrometheusRule manifests per spec §11:
  - `ProviderLatencyHigh`: p95 > 30s for 5m.
  - `SanctionsListStale`: `compliance_list_freshness_seconds > 93600` (26h).
  - `AuditIntegrityBroken`: `increase(compliance_audit_integrity_checks_total{result="broken"}[1h]) > 0` → severity critical.
  - `ProviderCircuitOpen`: `compliance_provider_circuit_breaker_state == 2` for 2m.
  - `VerificationFailureRateHigh`: failure-rate > 15% in 15m.
- [ ] Severities mapped: `critical`, `warning`. Runbook URL per alert.
- [ ] Validate with `promtool check rules` locally.
- [ ] **Commit:** `feat(otel): add Prometheus alerting rules + runbook references`.
- [ ] **GitHub issue:** `[Fase 1] Task 64 — Alerts` · labels `phase/1,scope/otel,type/feat,security/audit`.

---

## Task 65 — Docker: Dockerfile (multi-stage)

**Files:** `Dockerfile`, `.dockerignore`.

- [ ] Multi-stage:
  ```dockerfile
  FROM node:22.11-alpine AS builder
  RUN corepack enable
  WORKDIR /app
  COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
  COPY packages ./packages
  COPY proto ./proto
  RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
  RUN pnpm proto:gen && pnpm build

  FROM node:22.11-alpine AS runner
  WORKDIR /app
  RUN addgroup -S app && adduser -S app -G app
  COPY --from=builder --chown=app:app /app/node_modules ./node_modules
  COPY --from=builder --chown=app:app /app/packages/server/dist ./packages/server/dist
  COPY --from=builder --chown=app:app /app/packages/**/dist ./
  USER app
  EXPOSE 50071 8767 9464
  HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8767/healthz || exit 1
  ENV NODE_ENV=production
  ENTRYPOINT ["node", "packages/server/dist/bin/standalone.js"]
  ```
- [ ] `.dockerignore`: node_modules, dist, coverage, .git, tests, fixtures.
- [ ] Build image locally: `docker build -t compliance-core:0.1.0-dev .` → success, final image ~180MB.
- [ ] `docker run` with missing env → exits with clear validation error.
- [ ] **Commit:** `feat(docker): add multi-stage Dockerfile with non-root user + healthcheck`.
- [ ] **GitHub issue:** `[Fase 1] Task 65 — Dockerfile` · labels `phase/1,scope/docker,type/feat`.

---

## Task 66 — Docker Compose (dev)

**Files:** `docker-compose.yml`, `docker-compose.dev.yml`, `scripts/dev-bootstrap.sh`.

- [ ] Services:
  - `compliance-core`: built from local Dockerfile.
  - `postgres:16`: volumes persisted, init SQL `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
  - `redis:7-alpine`.
  - `vault:1.18`: dev mode with root token `dev-root-token`.
  - `otel-collector:contrib`.
  - `prometheus` + `grafana` + `tempo` + `loki` (profile `observability`).
- [ ] Healthchecks on every service.
- [ ] `scripts/dev-bootstrap.sh`: boots compose, waits for postgres/vault, seeds vault with sample provider credentials (sandbox keys, from `.env.dev`), runs migrations, runs smoke test against gRPC.
- [ ] Document in `docs/getting-started.md`.
- [ ] **Commit:** `feat(docker): add docker-compose with Postgres/Redis/Vault/OTel stack + bootstrap script`.
- [ ] **GitHub issue:** `[Fase 1] Task 66 — Compose stack` · labels `phase/1,scope/docker,type/feat`.

---

## Task 67 — Docker: image signing + SBOM

**Files:** CI workflow extension `.github/workflows/release.yml`.

- [ ] On tag `v0.1.*`, CI builds image, generates SBOM with `syft`, signs image with `cosign` (keyless via GitHub OIDC), pushes to GHCR `ghcr.io/lapc506/compliance-core`.
- [ ] SBOM uploaded as release asset.
- [ ] Document verification command: `cosign verify ghcr.io/lapc506/compliance-core:v0.1.0 --certificate-identity=...`
- [ ] **Commit:** `ci: add image signing + SBOM generation on release tags`.
- [ ] **GitHub issue:** `[Fase 1] Task 67 — Image signing` · labels `phase/1,scope/docker,scope/ci,type/chore`.

---

## Task 68 — Docker: integration smoke test in CI

**Files:** `.github/workflows/ci.yml` (extend).

- [ ] Add job `docker-smoke`: builds image, `docker compose up -d`, runs `scripts/smoke.sh` (gRPC `ComplianceHealth.GetProviderHealth`, REST `GET /healthz`), then `docker compose down`.
- [ ] Runs on PRs + main push.
- [ ] **Commit:** `ci: add docker-smoke job exercising image + compose stack`.
- [ ] **GitHub issue:** `[Fase 1] Task 68 — Docker smoke CI` · labels `phase/1,scope/ci,type/test`.

---

## Task 69 — Helm chart: Chart.yaml + values.yaml

**Files:** `helm/compliance-core/{Chart.yaml,values.yaml}`.

- [ ] `Chart.yaml` API v2, appVersion `0.1.0-dev`, description, keywords, maintainers.
- [ ] `values.yaml` with defaults:
  ```yaml
  image:
    repository: ghcr.io/lapc506/compliance-core
    tag: v0.1.0-dev
    pullPolicy: IfNotPresent
  replicaCount: 2
  service:
    grpc: { port: 50071, type: ClusterIP }
    rest: { port: 8767, type: ClusterIP }
    metrics: { port: 9464 }
  deployment:
    mode: sidecar          # sidecar | standalone
    resources:
      requests: { cpu: 100m, memory: 256Mi }
      limits:   { cpu: 500m, memory: 512Mi }
  vault: { addr: http://vault.vault.svc:8200, authMethod: kubernetes }
  otel: { endpoint: http://otel-collector.observability.svc:4317 }
  sealedSecrets: { enabled: false, mountPath: /run/secrets/compliance }
  probes:
    liveness:  { path: /healthz, port: 8767, periodSeconds: 10 }
    readiness: { path: /readyz,  port: 8767, periodSeconds: 5 }
  ```
- [ ] Lint `helm lint helm/compliance-core` → green.
- [ ] **Commit:** `feat(helm): add Chart.yaml + values.yaml with sidecar/standalone toggle`.
- [ ] **GitHub issue:** `[Fase 1] Task 69 — Helm chart base` · labels `phase/1,scope/helm,type/feat`.

---

## Task 70 — Helm chart: Deployment + Service + ConfigMap templates

**Files:** `helm/compliance-core/templates/{deployment,service,configmap,sealed-secret,servicemonitor}.yaml`.

- [ ] `deployment.yaml` with:
  - Security context: runAsNonRoot, readOnlyRootFilesystem, drop all capabilities.
  - ProjectedVolume for sealed-secrets (conditional via `.Values.sealedSecrets.enabled`).
  - Vault Agent sidecar annotation option.
  - Pod anti-affinity for HA.
- [ ] `service.yaml` exposes gRPC, REST, metrics.
- [ ] `configmap.yaml` injects non-secret env.
- [ ] `sealed-secret.yaml` is a Kubernetes SealedSecret resource (from bitnami sealed-secrets) for provider credentials.
- [ ] `servicemonitor.yaml` for Prometheus Operator scraping `/metrics` at port 9464.
- [ ] `helm template` output validates with `kubeval`.
- [ ] **Commit:** `feat(helm): add deployment/service/configmap/servicemonitor/sealed-secret templates`.
- [ ] **GitHub issue:** `[Fase 1] Task 70 — Helm templates` · labels `phase/1,scope/helm,type/feat`.

---

## Task 71 — Helm chart: CI lint + test-install

**Files:** `.github/workflows/ci.yml` (extend).

- [ ] Job `helm-lint`: runs `helm lint`, `helm template | kubeval`, `helm-docs` check.
- [ ] Job `helm-install` (on PR): spins up `kind` cluster, installs chart with fake values, waits for pod Ready, tears down. Uses `helm test`.
- [ ] **Commit:** `ci: add helm lint + kind install verification`.
- [ ] **GitHub issue:** `[Fase 1] Task 71 — Helm CI` · labels `phase/1,scope/helm,scope/ci,type/chore`.

---

## Task 72 — Docs: getting-started + architecture overview

**Files:** `docs/getting-started.md`, `docs/architecture.md`.

- [ ] `getting-started.md`:
  - Prereqs (Node 22, pnpm 9, Docker).
  - `pnpm install`, `pnpm proto:gen`, `scripts/dev-bootstrap.sh`.
  - First gRPC call via `grpcurl` against local `:50071`.
  - First REST call via `curl` against `:8767`.
- [ ] `architecture.md`: summarises spec §3 (hexagonal, 12 ports, dual deployment) with rendered mermaid. Links back to spec.
- [ ] **Commit:** `docs: add getting-started + architecture overview`.
- [ ] **GitHub issue:** `[Fase 1] Task 72 — Docs: getting-started + architecture` · labels `phase/1,scope/docs,type/docs`.

---

## Task 73 — Docs: API reference (gRPC + REST)

**Files:** `docs/api-reference/{grpc,rest}.md`.

- [ ] gRPC: one section per service (Admin, Screening, Audit, Health); per RPC a description, request/response schema excerpt from proto, error codes.
- [ ] REST: generated from OpenAPI YAML via `redocly` CLI — committed markdown is human-reviewed render.
- [ ] Note: AML + Whistle services listed with a clear `UNIMPLEMENTED (Fase 2-3)` banner.
- [ ] **Commit:** `docs: add gRPC + REST API reference`.
- [ ] **GitHub issue:** `[Fase 1] Task 73 — API reference` · labels `phase/1,scope/docs,type/docs`.

---

## Task 74 — Docs: security + operations

**Files:** `docs/security.md`, `docs/operations/{deployment,observability}.md`.

- [ ] `security.md`: PII handling, envelope encryption, key rotation, webhook HMAC, RBAC placeholder, responsible disclosure contact.
- [ ] `operations/deployment.md`: sidecar vs standalone, Helm install, Vault setup, sealed-secrets setup, graceful shutdown behavior.
- [ ] `operations/observability.md`: Prometheus scrape config, OTel collector config, Grafana dashboard import steps, alerting rule deployment.
- [ ] **Commit:** `docs: add security + operations docs`.
- [ ] **GitHub issue:** `[Fase 1] Task 74 — Security + operations docs` · labels `phase/1,scope/docs,type/docs,security/pii`.

---

## Task 75 — Docs: adapters + README update

**Files:** `docs/adapters/{persona,ondato,ofac}.md`, `README.md` (update).

- [ ] Each adapter doc: responsibility, endpoints consumed, credentials path in Vault, webhook format, current Fase 1 coverage vs future.
- [ ] Update `README.md` Fase 1 section with link to this plan and a checklist mirroring task progress.
- [ ] **Commit:** `docs: add per-adapter docs + README Fase 1 progress section`.
- [ ] **GitHub issue:** `[Fase 1] Task 75 — Adapter docs + README` · labels `phase/1,scope/docs,type/docs`.

---

## Self-review against spec

Before declaring Fase 1 complete, walk the plan + implementation against spec sections:

- [ ] **§3 Architecture**: Hexagonal layout matches; 12 ports defined (Task 17 + Task 18) even though only 5 are implemented in Fase 1 (identity-verification, sanctions-screening, audit-log, verification-repository, provider-credential-vault) — others present as interfaces.
- [ ] **§3.3 Deployment modes**: standalone + sidecar covered by `bin/standalone.ts` + `bin/sidecar.ts`, ports `:50071` / `:8767` / `:9464`.
- [ ] **§4 Domain**: `Identity`, `BusinessEntity` (skeleton), `VerificationSession`, `SanctionsMatch`, `ComplianceEvent` implemented. `PEPMatch`, `RiskScore`, `WhistleblowerReport`, `ProviderAccount` deferred to Fases 2-3.
- [ ] **§4.2 State machine**: Tested per-transition (Task 11).
- [ ] **§4.4 Audit integrity**: SHA-256 chain + tamper test (Task 14) + hourly verify cron (Task 50) + signed forensic export (Task 51).
- [ ] **§5 Ports**: 5 of 12 implemented in Fase 1 — all 12 have interface definitions so Fases 2-3 can wire adapters without disruption.
- [ ] **§6 Proto**: 6 services registered; Admin/Screening/Audit/Health fully wired; AML/Whistle return UNIMPLEMENTED.
- [ ] **§7 Adapters**: Persona (KYC) + Ondato (age only) + OFAC SDN feed done. UN + EU feeds, Incode, Snap deferred.
- [ ] **§10 Testing**: TDD per task, domain coverage ≥ 95%, app ≥ 85%, fuzzy-match golden cases precision/recall ≥ 0.95, chaos tested via circuit breaker, integration tests against dockerized deps.
- [ ] **§11 Observability**: pino + OTel + 5 dashboards (of 7 — whistleblower/AML dashboards land with their features), 5 alerting rules.
- [ ] **§12 Security**: Envelope encryption on PII columns, PII redaction in logs, HMAC webhook verification, append-only audit, Vault credential flow. Crypto-shred deferred to Fase 2 (right-to-be-forgotten UX not needed for HabitaNexus Fase 1 go-live).
- [ ] **§14 Fase 1 roadmap**: every deliverable bullet mapped to tasks (Task 1-75).

If any check fails, open a follow-up issue `[Fase 1] gap: <topic>` before declaring done.

---

## Execution handoff

- Primary sub-skill: **`superpowers:subagent-driven-development`** to fan tasks out in parallel where dependencies allow. Alternative: `superpowers:executing-plans` for sequential execution with review gates.
- Git strategy: one branch per task (`feat/task-NN-<slug>`), open draft PR with the task checklist copied, merge when all checkboxes green + CI passes. Rebase onto `main` before merge.
- Review rhythm: after every 10 tasks (i.e., after 10, 20, 30, 40, 50, 60, 70), pause for a governance review against the rubric criteria; adjust plan if findings emerge.
- Worktree isolation: follow `superpowers:using-git-worktrees` when multiple tasks run in parallel to avoid cross-branch pollution.
- Done criteria: all 75 tasks merged, CI green, `helm install` works against a `kind` cluster, Persona sandbox E2E verification completes, audit chain verifies over 10k synthetic events, docs render cleanly.

---

## Appendix A — Bulk GitHub issues creation script

`scripts/create-github-issues.sh`:

```bash
#!/usr/bin/env bash
# Bulk-create all Fase 1 issues on lapc506/compliance-core.
# Requires: gh auth login, labels already created via create-github-labels.sh.
set -euo pipefail

REPO="lapc506/compliance-core"
PHASE_LABEL="phase/1"

create() {
  local number="$1" title="$2" labels="$3" body="$4"
  gh issue create \
    --repo "$REPO" \
    --title "[Fase 1] Task ${number} — ${title}" \
    --label "${PHASE_LABEL},${labels}" \
    --body "${body}"
}

create 1  "pnpm workspace scaffold"                "scope/scaffold,type/chore"         "Initialize pnpm monorepo with strict tsconfig, Node 22 pin, env template."
create 2  "Biome lint + format"                    "scope/ci,type/chore"               "Biome config with strict rules (no any, no console)."
create 3  "Vitest + coverage thresholds"           "scope/ci,type/chore"               "Root Vitest config enforcing ≥95% domain coverage."
create 4  "CI workflow"                            "scope/ci,type/chore"               "Matrix CI: lint, typecheck, test, proto, build."
create 5  "Labels taxonomy"                        "scope/ci,type/chore"               "Bootstrap GitHub label taxonomy (phase/scope/type/security/priority)."
create 6  "Domain VOs"                             "scope/domain,type/feat"            "UUID, Hex32, ISODateTime, Jurisdiction, Decimal value objects."
create 7  "TaxId VO"                               "scope/domain,type/feat,security/pii" "Multi-jurisdiction TaxId with checksum + redaction."
create 8  "PIIString + DocumentRef"                "scope/domain,type/feat,security/pii" "Safe-by-default PII wrapper type."
create 9  "Identity entity"                        "scope/domain,type/feat,security/pii" "Identity aggregate root."
create 10 "BusinessEntity skeleton"                "scope/domain,type/feat"            "Minimal BusinessEntity (full KYB in Fase 2)."
create 11 "VerificationSession state machine"      "scope/domain,type/feat"            "State transitions per spec §4.2 with property tests."
create 12 "SanctionsMatch entity"                  "scope/domain,type/feat"            "Review lifecycle."
create 13 "ComplianceEvent entity"                 "scope/domain,type/feat,security/audit" "Self-validating hash."
create 14 "AuditChainService"                      "scope/domain,type/feat,security/audit,priority/p0" "SHA-256 chain + tamper detection test."
create 15 "MatchNormalizer"                        "scope/domain,type/feat,priority/p0" "Jaro-Winkler + Double Metaphone + DOB."
create 16 "Domain events + errors"                 "scope/domain,type/feat"            "6 events, typed errors, no PII leakage."
create 17 "Infrastructure ports"                   "scope/app,type/feat"               "Clock/Logger/Metrics/Tracing/EventBus/Idempotency/SecretsStore."
create 18 "Domain ports"                           "scope/app,type/feat,security/credentials" "IdentityVerification/Sanctions/AuditLog/Repository/Vault."
create 19 "StartVerification + CompleteVerification" "scope/app,type/feat,security/pii,priority/p0" "Core verification lifecycle commands."
create 20 "Remaining commands + queries"           "scope/app,type/feat"               "ScreenSanctions, RefreshLists, AppendAuditEvent, queries."
create 21 "Middleware chain"                       "scope/app,type/feat,security/pii,priority/p0" "PII redactor, tracing, idempotency, metrics, auth."
create 22 "Proto common/admin/screening"           "scope/proto,type/feat"             "Proto v1 base + admin + screening services."
create 23 "Proto audit/health/stubs"               "scope/proto,type/feat"             "Audit + Health + AML/Whistle stubs."
create 24 "Postgres: identities + verifications"   "scope/postgres,type/feat,security/pii" "Drizzle schema with envelope encryption columns."
create 25 "Postgres: sanctions tables"             "scope/postgres,type/feat"          "sanctions_list_entries + sanctions_matches + trigram + GIN."
create 26 "Postgres: audit_log + triggers"         "scope/postgres,type/feat,security/audit,priority/p0" "Append-only trigger + idempotency table."
create 27 "VerificationRepository"                 "scope/postgres,type/feat,security/pii,priority/p0" "Repository with envelope encryption wire-up."
create 28 "SanctionsRepository"                    "scope/postgres,type/feat"          "Trigram + alias search."
create 29 "AuditLogRepository"                     "scope/postgres,type/feat,security/audit,priority/p0" "Advisory-lock append + cursor export."
create 30 "ProviderCredentialVault"                "scope/vault,type/feat,security/credentials,priority/p0" "Vault + sealed-secrets loaders with Disposable buffers."
create 31 "Persona HTTP client"                    "scope/persona,type/feat,security/credentials" "HTTP client with retries + zod DTOs."
create 32 "Persona start/status"                   "scope/persona,type/feat,security/pii,priority/p0" "startVerification + getSessionStatus."
create 33 "Persona fetchEvidence"                  "scope/persona,type/feat,security/pii" "Encrypted evidence storage."
create 34 "Persona webhook verifier"               "scope/persona,type/feat,security/credentials,priority/p0" "HMAC verification with replay protection."
create 35 "Persona webhook handler"                "scope/persona,type/feat,security/credentials,priority/p0" "Idempotent webhook → command routing."
create 36 "Persona resilience"                     "scope/persona,type/feat"           "Circuit breaker + rate-limit awareness."
create 37 "quickCheck stub"                        "scope/persona,type/feat"           "Stub for Fase 2 real impl."
create 38 "Persona E2E test"                       "scope/persona,type/test,priority/p0" "Full lifecycle test."
create 39 "Ondato client skeleton"                 "scope/ondato,type/feat"            "OAuth2 skeleton."
create 40 "Ondato age verification"                "scope/ondato,type/feat"            "AGE kind only; others NOT_SUPPORTED_IN_FASE_1."
create 41 "Ondato scope docs"                      "scope/ondato,scope/docs,type/docs" "Fase 1 vs Fase 2 coverage."
create 42 "Ondato webhook skeleton"                "scope/ondato,type/feat,security/credentials" "HMAC + age-verification event handler."
create 43 "OFAC downloader"                        "scope/ofac,type/feat"              "SDN XML downloader with If-Modified-Since."
create 44 "OFAC parser"                            "scope/ofac,type/feat,priority/p0"  "XML → SanctionsListEntry + transliteration."
create 45 "OFAC ingester"                          "scope/ofac,type/feat,priority/p0"  "Upsert + soft-delete + ListRefreshed audit."
create 46 "OFAC cron"                              "scope/ofac,type/feat"              "Daily cron + catch-up on stale state."
create 47 "Sanctions screen()"                     "scope/ofac,type/feat,priority/p0"  "Fuzzy matcher with threshold."
create 48 "Sanctions resolve"                      "scope/ofac,type/feat"              "getMatch + resolveMatch + audit."
create 49 "Audit append wiring"                    "scope/postgres,type/feat,security/audit,priority/p0" "Wire AuditLogRepository with AuditChainService."
create 50 "Audit integrity cron"                   "scope/postgres,type/feat,security/audit,priority/p0" "Hourly verify + write freeze on break."
create 51 "Audit export"                           "scope/postgres,type/feat,security/audit" "Signed forensic export."
create 52 "Audit contract tests"                   "scope/postgres,type/test,security/audit" "Portable contract suite."
create 53 "gRPC bootstrap"                         "scope/grpc,type/feat,priority/p0"  "gRPC server + DI composition."
create 54 "gRPC interceptors"                      "scope/grpc,type/feat,security/pii" "Tracing + auth + PII redaction."
create 55 "Admin + Screening services"             "scope/grpc,type/feat,priority/p0"  "ComplianceAdmin + ComplianceScreening RPCs."
create 56 "Audit + Health services"                "scope/grpc,type/feat,security/audit" "ComplianceAudit + ComplianceHealth RPCs."
create 57 "AML/Whistle stubs"                      "scope/grpc,type/feat"              "UNIMPLEMENTED stubs for Fase 2-3."
create 58 "REST bootstrap"                         "scope/rest,type/feat"              "Fastify + helmet + OpenAPI."
create 59 "REST admin + screening"                 "scope/rest,type/feat"              "Standalone REST routes."
create 60 "Webhooks"                               "scope/rest,type/feat,security/credentials,priority/p0" "Persona + Ondato webhook routes."
create 61 "OTel SDK"                               "scope/otel,type/feat"              "Tracer + metrics + Prometheus bridge."
create 62 "Pino logger"                            "scope/otel,type/feat,security/pii,priority/p0" "PII redaction fixture test."
create 63 "Grafana dashboards"                     "scope/otel,type/feat"              "5 dashboards (funnel/sanctions/audit/providers/SRE)."
create 64 "Alerts"                                 "scope/otel,type/feat,security/audit" "PrometheusRule manifests."
create 65 "Dockerfile"                             "scope/docker,type/feat"            "Multi-stage image, non-root, healthcheck."
create 66 "Compose stack"                          "scope/docker,type/feat"            "Dev stack + bootstrap script."
create 67 "Image signing"                          "scope/docker,scope/ci,type/chore"  "Cosign + SBOM on tags."
create 68 "Docker smoke CI"                        "scope/ci,type/test"                "Build + compose + smoke in CI."
create 69 "Helm chart base"                        "scope/helm,type/feat"              "Chart.yaml + values.yaml."
create 70 "Helm templates"                         "scope/helm,type/feat"              "Deployment/Service/ConfigMap/ServiceMonitor."
create 71 "Helm CI"                                "scope/helm,scope/ci,type/chore"    "Lint + kind install."
create 72 "Docs: getting-started + architecture"   "scope/docs,type/docs"              "Onboarding + overview."
create 73 "API reference"                          "scope/docs,type/docs"              "gRPC + REST reference."
create 74 "Security + operations docs"             "scope/docs,type/docs,security/pii" "Security model + runbooks."
create 75 "Adapter docs + README"                  "scope/docs,type/docs"              "Per-adapter docs + README Fase 1 progress."

echo "Created 75 Fase 1 issues on ${REPO}."
```

Make executable: `chmod +x scripts/create-github-issues.sh`. Run after Task 5 (labels exist).

---

## Appendix B — Labels bootstrap script (summary)

Full script lives at `scripts/create-github-labels.sh` (Task 5). Label matrix:

| Namespace | Labels |
|---|---|
| `phase/` | `phase/1`, `phase/2`, `phase/3`, `phase/4`, `phase/5` |
| `scope/` | `scope/scaffold`, `scope/proto`, `scope/domain`, `scope/app`, `scope/persona`, `scope/ondato`, `scope/ofac`, `scope/postgres`, `scope/vault`, `scope/otel`, `scope/grpc`, `scope/rest`, `scope/docker`, `scope/helm`, `scope/docs`, `scope/ci` |
| `type/` | `type/feat`, `type/fix`, `type/chore`, `type/docs`, `type/test`, `type/refactor` |
| `security/` | `security/pii`, `security/credentials`, `security/audit` |
| `priority/` | `priority/p0`, `priority/p1`, `priority/p2` |

Script uses `gh label create ... --force` (idempotent) so it is safe to re-run.
