-- CreateEnum
CREATE TYPE "LedgerOperation" AS ENUM ('MINT', 'TRANSFER', 'BURN');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddr" TEXT NOT NULL,
    "txHash" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "operation" "LedgerOperation" NOT NULL,
    "ref" TEXT,
    "blockNumber" INTEGER,
    "status" "LedgerStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_txHash_key" ON "LedgerEntry"("txHash");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_walletAddr_idx" ON "LedgerEntry"("walletAddr");

-- CreateIndex
CREATE INDEX "LedgerEntry_operation_idx" ON "LedgerEntry"("operation");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletMapping_userId_key" ON "WalletMapping"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletMapping_walletAddr_key" ON "WalletMapping"("walletAddr");
