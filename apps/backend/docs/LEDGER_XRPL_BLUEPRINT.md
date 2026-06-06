# Ledger XRPL Blueprint (Implementation-Ready)

## Scope
This blueprint delivers a production path for replacing direct EVM coupling with a provider-agnostic ledger adapter and XRPL integration.

## Deliverables included in repository
1. Adapter contracts:
   - apps/backend/Backend/ledger-service/src/ledger-adapters/ledger-adapter.types.ts
   - apps/backend/Backend/ledger-service/src/ledger-adapters/ledger-adapter.interface.ts
2. XRPL adapter skeleton:
   - apps/backend/Backend/ledger-service/src/ledger-adapters/xrpl/xrpl.adapter.ts
3. Updated data model (next schema + SQL blueprint):
   - apps/backend/Backend/ledger-service/prisma/schema.xrpl-next.prisma
   - apps/backend/Backend/ledger-service/prisma/migrations/20260606_ledger_xrpl_blueprint/migration.sql
4. Production checklist:
   - apps/backend/docs/LEDGER_XRPL_PRODUCTION_CHECKLIST.md

## Architecture target
- Keep LedgerService as orchestration/business layer.
- Introduce LedgerAdapter abstraction for provider-specific operations.
- Start with XrplAdapter while preserving EVM compatibility path.
- Use outbox + reconciliation jobs to guarantee eventual consistency.

## Integration steps (code)
1. Add adapter module:
   - Create module that provides LEDGER_ADAPTER_TOKEN.
   - Select adapter by env (LEDGER_PROVIDER=XRPL|EVM).
2. Refactor BlockchainService calls in ledger.service.ts:
   - Replace direct blockchain.mint/transfer/burn calls with adapter methods.
   - Generate idempotency key from sourceTransactionId + operation.
3. Move synchronous confirmation out of request path:
   - API/Event handler writes QUEUED ledger entry.
   - Worker submits transaction and updates SUBMITTED/CONFIRMED/FAILED.
4. Add reconciliation worker:
   - Scan LedgerEntry where status in (QUEUED, SUBMITTED, FAILED retryable).
   - Create/update ReconciliationJob and retry with backoff.
5. Publish downstream events through LedgerOutbox worker instead of direct publish.

## Integration steps (database)
1. Apply migration blueprint in staging first.
2. Backfill amountAtomic and amountDisplay from legacy amount.
3. Enforce idempotency unique key.
4. Switch service read/write path to new fields.
5. Drop legacy amount field only after stable cutover.

## XRPL implementation notes
- Token model: issued currency (currency code + issuer account).
- Mint/Transfer/Burn are represented via Payment transactions.
- Idempotency and correlation are persisted in transaction memos.
- Reliable submission requires:
  - LastLedgerSequence management.
  - Sequence handling and retry policy for ter/tef cases.
  - Multi-endpoint strategy for WebSocket client resilience.

## Acceptance criteria
- Duplicate wallet.deposit events do not create duplicate mint operations.
- LedgerEntry has deterministic idempotency for each business command.
- PENDING/FAILED operations are eventually reconciled or escalated.
- Outbox guarantees at-least-once event publication with dedupe keys.
- On-chain tx metadata remains traceable by correlationId/sourceTransactionId.
