-- Zero-downtime additive migration for XRPL-ready ledger-service.
-- Safe to apply before any provider cutover.

ALTER TABLE "LedgerEntry"
  ADD COLUMN IF NOT EXISTS "network" TEXT NOT NULL DEFAULT 'EVM',
  ADD COLUMN IF NOT EXISTS "amountAtomic" NUMERIC(38, 0),
  ADD COLUMN IF NOT EXISTS "amountDisplay" NUMERIC(38, 6),
  ADD COLUMN IF NOT EXISTS "currencyCode" TEXT NOT NULL DEFAULT 'VAKS',
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "correlationId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerSequence" TEXT,
  ADD COLUMN IF NOT EXISTS "blockOrLedgerIndex" INTEGER,
  ADD COLUMN IF NOT EXISTS "submitAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "lastErrorCode" TEXT,
  ADD COLUMN IF NOT EXISTS "lastErrorMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

UPDATE "LedgerEntry"
SET
  "amountDisplay" = COALESCE("amountDisplay", ROUND(("amount")::numeric, 6)),
  "amountAtomic" = COALESCE("amountAtomic", ROUND(("amount")::numeric * 1000000, 0))
WHERE "amountDisplay" IS NULL
   OR "amountAtomic" IS NULL;

UPDATE "LedgerEntry"
SET "idempotencyKey" = COALESCE("idempotencyKey", CONCAT('legacy:', "id"))
WHERE "idempotencyKey" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEntry_idempotencyKey_operation_network_key"
  ON "LedgerEntry" ("idempotencyKey", "operation", "network");

CREATE INDEX IF NOT EXISTS "LedgerEntry_status_nextRetryAt_idx"
  ON "LedgerEntry" ("status", "nextRetryAt");

CREATE INDEX IF NOT EXISTS "LedgerEntry_sourceTransactionId_idx"
  ON "LedgerEntry" ("sourceTransactionId");

CREATE INDEX IF NOT EXISTS "LedgerEntry_txHash_idx"
  ON "LedgerEntry" ("txHash");

ALTER TABLE "WalletMapping"
  ADD COLUMN IF NOT EXISTS "network" TEXT NOT NULL DEFAULT 'EVM',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS "LedgerOutbox" (
  "id" TEXT PRIMARY KEY,
  "stream" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "partitionKey" TEXT,
  "payload" JSONB NOT NULL,
  "dedupeKey" TEXT UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "publishedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LedgerOutbox_status_nextAttemptAt_idx"
  ON "LedgerOutbox" ("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "LedgerOutbox_stream_event_createdAt_idx"
  ON "LedgerOutbox" ("stream", "event", "createdAt");

CREATE TABLE IF NOT EXISTS "ReconciliationJob" (
  "id" TEXT PRIMARY KEY,
  "ledgerEntryId" TEXT NOT NULL REFERENCES "LedgerEntry"("id") ON DELETE CASCADE,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP,
  "resultSnapshot" JSONB,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "resolvedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ReconciliationJob_status_nextAttemptAt_idx"
  ON "ReconciliationJob" ("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "ReconciliationJob_ledgerEntryId_status_idx"
  ON "ReconciliationJob" ("ledgerEntryId", "status");
