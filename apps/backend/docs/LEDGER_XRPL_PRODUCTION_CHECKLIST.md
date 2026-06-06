# Ledger XRPL Production Checklist

## 1) Key security
- Store issuer and operational wallet secrets in a managed secret store (no plain env in runtime).
- Separate roles:
  - Issuer account: governance-controlled, limited usage.
  - Operational wallet: transaction execution with strict limits.
- Enforce key rotation runbook every 90 days or after any incident.
- Restrict secret access by service account and environment.
- Enable immutable audit logs for all key access operations.

## 2) XRPL runtime hardening
- Configure at least 2 XRPL endpoints with health-based failover.
- Implement reconnect logic with jittered exponential backoff.
- Validate server_info before marking endpoint healthy.
- Enforce LastLedgerSequence for all submits.
- Implement retry policy per engine result class:
  - tes: success
  - ter: retryable
  - tec/tef: fail and reconcile/manual path

## 3) Data consistency and idempotency
- Require idempotency key in every command path.
- Add unique constraint on (idempotencyKey, operation, network).
- Persist sourceEventId and sourceTransactionId for cross-service tracing.
- Use outbox table for downstream event publishing.
- Add reconciliation worker for QUEUED/SUBMITTED timeout states.

## 4) Runbooks
- Runbook: stuck QUEUED operations.
  - Query entries older than threshold.
  - Trigger reconciliation replay.
  - Escalate if attempts exceed max.
- Runbook: high failure ratio.
  - Check endpoint health and sequence drift.
  - Pause submissions via feature flag.
  - Resume after controlled canary.
- Runbook: duplicate events.
  - Verify idempotency collisions.
  - Confirm dedupe in outbox consumer.
- Runbook: key compromise.
  - Rotate compromised key.
  - Freeze issuer flows if needed.
  - Reissue operational wallet credentials.

## 5) Observability and alerts
- Metrics:
  - ledger_submit_total{operation,status}
  - ledger_confirm_latency_seconds
  - ledger_retry_total{reason}
  - ledger_reconciliation_backlog
  - ledger_outbox_backlog
- Logs must include correlationId, idempotencyKey, sourceTransactionId, txHash.
- Alerts:
  - P1: confirmation failure ratio > 2% for 5m.
  - P1: reconciliation backlog > 500 for 10m.
  - P2: p95 confirmation latency > 30s for 15m.
  - P2: outbox oldest pending age > 120s.

## 6) SLOs
- Availability SLO: 99.9% successful command acceptance (QUEUED or SUBMITTED).
- Consistency SLO: 99.99% of accepted commands reconciled within 5 minutes.
- Latency SLO: p95 CONFIRMED within 20 seconds.
- Data integrity SLO: zero unresolved idempotency conflicts per release.

## 7) Release and rollback
- Release in phases:
  - Shadow mode (write mirror only).
  - Canary (1-5%).
  - Gradual rollout.
- Keep feature flags:
  - LEDGER_PROVIDER
  - LEDGER_SUBMISSION_ENABLED
  - LEDGER_RECONCILIATION_ENABLED
- Rollback plan:
  - Stop new submits.
  - Keep reconciliation running.
  - Route new writes to fallback provider.

## 8) Operational readiness gate
- Security review approved.
- Load test with production-like volume completed.
- Chaos test for endpoint outage and retry paths completed.
- On-call rotation trained on runbooks.
- Dashboards and alerts verified in staging and production.
