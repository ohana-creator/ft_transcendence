-- Blueprint migration for XRPL-ready ledger model.
-- Review carefully before applying in production.

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE "LedgerNetwork" AS ENUM ('EVM', 'XRPL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'RUNNING', 'RESOLVED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReconciliationReason" AS ENUM ('PENDING_TIMEOUT', 'RETRYABLE_PROVIDER_ERROR', 'MANUAL_REPAIR', 'PERIODIC_AUDIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerStatus_new" AS ENUM ('QUEUED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'COMPENSATED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) LedgerEntry: add columns
ALTER TABLE "LedgerEntry"
  ADD COLUMN IF NOT EXISTS "network" "LedgerNetwork" NOT NULL DEFAULT 'XRPL',
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
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP;

-- 3) Backfill amount columns from old float amount (best-effort)
UPDATE "LedgerEntry"
SET
  "amountDisplay" = ROUND(("amount")::numeric, 6),
  "amountAtomic" = ROUND(("amount")::numeric * 1000000, 0)
WHERE "amountAtomic" IS NULL OR "amountDisplay" IS NULL;

-- 4) Enforce idempotency key presence
UPDATE "LedgerEntry"
SET "idempotencyKey" = CONCAT('legacy:', "id")
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "LedgerEntry"
  ALTER COLUMN "amountAtomic" SET NOT NULL,
  ALTER COLUMN "amountDisplay" SET NOT NULL,
  ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- 5) Move status enum to new values
ALTER TABLE "LedgerEntry"
  ADD COLUMN IF NOT EXISTS "status_new" "LedgerStatus_new" NOT NULL DEFAULT 'QUEUED';

UPDATE "LedgerEntry"
SET "status_new" = CASE
  WHEN "status"::text = 'PENDING' THEN 'QUEUED'::"LedgerStatus_new"
  WHEN "status"::text = 'CONFIRMED' THEN 'CONFIRMED'::"LedgerStatus_new"
  WHEN "status"::text = 'FAILED' THEN 'FAILED'::"LedgerStatus_new"
  ELSE 'QUEUED'::"LedgerStatus_new"
END;

ALTER TABLE "LedgerEntry" DROP COLUMN IF EXISTS "status";
ALTER TYPE "LedgerStatus" RENAME TO "LedgerStatus_legacy";
ALTER TYPE "LedgerStatus_new" RENAME TO "LedgerStatus";
ALTER TABLE "LedgerEntry" RENAME COLUMN "status_new" TO "status";

-- 6) Keep backward compatibility (old column) before app cutover.
-- Drop only after application migration is complete.
-- ALTER TABLE "LedgerEntry" DROP COLUMN "amount";

-- 7) Idempotency and performance indexes
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEntry_idempotency_op_network_key"
  ON "LedgerEntry" ("idempotencyKey", "operation", "network");

CREATE INDEX IF NOT EXISTS "LedgerEntry_status_nextRetryAt_idx"
  ON "LedgerEntry" ("status", "nextRetryAt");

CREATE INDEX IF NOT EXISTS "LedgerEntry_sourceTransactionId_idx"
  ON "LedgerEntry" ("sourceTransactionId");

CREATE INDEX IF NOT EXISTS "LedgerEntry_txHash_idx"
  ON "LedgerEntry" ("txHash");

-- 8) WalletMapping network support
ALTER TABLE "WalletMapping"
  ADD COLUMN IF NOT EXISTS "network" "LedgerNetwork" NOT NULL DEFAULT 'XRPL',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

-- 9) Outbox table for reliable event publication
CREATE TABLE IF NOT EXISTS "LedgerOutbox" (
  "id" TEXT PRIMARY KEY,
  "stream" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "partitionKey" TEXT,
  "payload" JSONB NOT NULL,
  "dedupeKey" TEXT UNIQUE,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
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

-- 10) Reconciliation jobs table
CREATE TABLE IF NOT EXISTS "ReconciliationJob" (
  "id" TEXT PRIMARY KEY,
  "ledgerEntryId" TEXT NOT NULL REFERENCES "LedgerEntry"("id") ON DELETE CASCADE,
  "reason" "ReconciliationReason" NOT NULL,
  "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
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

-- 11) Optional cleanup after full cutover
-- DROP TYPE "LedgerStatus_legacy";
