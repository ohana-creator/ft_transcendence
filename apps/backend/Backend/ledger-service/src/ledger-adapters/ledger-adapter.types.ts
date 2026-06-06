export type LedgerNetwork = 'EVM' | 'XRPL';

export type LedgerOperation = 'MINT' | 'TRANSFER' | 'BURN';

export type AdapterSubmitStatus =
  | 'QUEUED'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'FAILED';

export interface LedgerCommandContext {
  correlationId: string;
  idempotencyKey: string;
  sourceEventId?: string;
  sourceTransactionId?: string;
  requestedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface MintCommand {
  toAddress: string;
  amountAtomic: string;
  reference?: string;
}

export interface TransferCommand {
  fromAddress?: string;
  toAddress: string;
  amountAtomic: string;
  reference?: string;
}

export interface BurnCommand {
  fromAddress: string;
  amountAtomic: string;
  reference?: string;
}

export interface AdapterSubmitResult {
  network: LedgerNetwork;
  operation: LedgerOperation;
  status: AdapterSubmitStatus;
  txHash?: string;
  providerSequence?: string;
  acceptedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AdapterBalanceResult {
  network: LedgerNetwork;
  walletAddress: string;
  balanceAtomic: string;
  balanceDisplay: string;
}

export interface AdapterSupplyResult {
  network: LedgerNetwork;
  totalSupplyAtomic: string;
  totalSupplyDisplay: string;
}

export interface AdapterTxResult {
  network: LedgerNetwork;
  txHash: string;
  status: 'CONFIRMED' | 'FAILED' | 'PENDING' | 'UNKNOWN';
  blockOrLedgerIndex?: number;
  feeAtomic?: string;
  explorerUrl?: string;
  confirmedAt?: string;
  raw?: Record<string, unknown>;
}

export interface AdapterHealthResult {
  network: LedgerNetwork;
  connected: boolean;
  endpoint?: string;
  details?: Record<string, unknown>;
}
