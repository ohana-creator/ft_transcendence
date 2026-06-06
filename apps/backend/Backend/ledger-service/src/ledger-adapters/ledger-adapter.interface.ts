import {
  AdapterBalanceResult,
  AdapterHealthResult,
  AdapterSubmitResult,
  AdapterSupplyResult,
  AdapterTxResult,
  BurnCommand,
  LedgerCommandContext,
  LedgerNetwork,
  MintCommand,
  TransferCommand,
} from './ledger-adapter.types.js';

export const LEDGER_ADAPTER_TOKEN = Symbol('LEDGER_ADAPTER_TOKEN');

export interface LedgerAdapter {
  readonly network: LedgerNetwork;

  mint(command: MintCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult>;

  transfer(command: TransferCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult>;

  burn(command: BurnCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult>;

  getBalance(walletAddress: string): Promise<AdapterBalanceResult>;

  getTotalSupply(): Promise<AdapterSupplyResult>;

  getTransaction(txHash: string): Promise<AdapterTxResult>;

  healthCheck(): Promise<AdapterHealthResult>;
}
