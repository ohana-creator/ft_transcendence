# Ledger XRPL Cutover Plan

## Goal
Move the ledger-service from a direct EVM-first path to an XRPL-ready architecture without downtime.

## Principle
Only additive changes in staging first. No destructive schema change, no hard switch on the first deploy.

## Phase 0: Preparation
- Deploy the adapter abstraction.
- Keep `LEDGER_PROVIDER=EVM`.
- Keep `LEDGER_RECONCILIATION_ENABLED=false` and `LEDGER_OUTBOX_ENABLED=false`.
- Apply the zero-downtime migration in staging only.
- Verify Prisma migrations, service boot, and health checks.

## Phase 1: Shadow mode
- Enable `LEDGER_OUTBOX_ENABLED=true` in staging.
- Keep `LEDGER_PROVIDER=EVM`.
- Keep XRPL adapter instantiated but not selected in the request path.
- Record `idempotencyKey`, `sourceTransactionId`, and correlation metadata.
- Compare ledger submission latency and reconciliation results with the current path.

## Phase 2: Canary submission
- Set `LEDGER_PROVIDER=XRPL` for 1-5% of traffic.
- Keep reconciliation and outbox enabled.
- Monitor:
  - submission failures
  - duplicate event rate
  - reconciliation backlog
  - ledger confirmation latency
- Roll back instantly if SLOs regress.

## Phase 3: Progressive rollout
- Increase XRPL traffic share in steps.
- Keep EVM path as fallback through the feature flag.
- Maintain read compatibility with historical EVM entries.

## Phase 4: Cutover
- Set XRPL as default provider.
- Keep EVM code available for rollback only.
- Switch workers and alerts to XRPL-specific thresholds.
- Freeze contract-specific features that do not map to XRPL semantics.

## Phase 5: Cleanup
- Remove EVM-specific submission paths only after a stable period.
- Drop legacy-only fields in a later maintenance window, not during the cutover.
- Archive the migration history and runbooks.
