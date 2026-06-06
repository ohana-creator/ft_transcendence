import { Injectable, Logger } from '@nestjs/common';
import { Client, convertStringToHex, Wallet } from 'xrpl';
import {
  AdapterBalanceResult,
  AdapterHealthResult,
  AdapterSubmitResult,
  AdapterSupplyResult,
  AdapterTxResult,
  BurnCommand,
  LedgerCommandContext,
  MintCommand,
  TransferCommand,
} from '../ledger-adapter.types.js';
import { LedgerAdapter } from '../ledger-adapter.interface.js';

interface XrplLikeClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  request(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  submitAndWait(
    tx: Record<string, unknown>,
    opts: { wallet: Wallet },
  ): Promise<Record<string, unknown>>;
  getLedgerIndex(): Promise<number>;
}

interface XrplAdapterConfig {
  wsUrl: string;
  issuerAddress: string;
  currencyCode: string;
  operationalWalletAddress: string;
  operationalWalletSeed: string;
  explorerBaseUrl?: string;
}

@Injectable()
export class XrplAdapter implements LedgerAdapter {
  public readonly network = 'XRPL' as const;
  private readonly logger = new Logger(XrplAdapter.name);

  constructor(
    private readonly config: XrplAdapterConfig,
    private readonly client: XrplLikeClient,
    private readonly wallet?: Wallet,
  ) {}

  async mint(command: MintCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult> {
    const tx = this.buildIssuedCurrencyPayment({
      destination: command.toAddress,
      amountDisplay: command.amountAtomic,
      memoRef: command.reference,
      context,
    });

    return this.submitTransaction('MINT', tx);
  }

  async transfer(command: TransferCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult> {
    const tx = this.buildIssuedCurrencyPayment({
      destination: command.toAddress,
      amountDisplay: command.amountAtomic,
      memoRef: command.reference,
      context,
    });

    return this.submitTransaction('TRANSFER', tx);
  }

  async burn(command: BurnCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult> {
    const tx = this.buildIssuedCurrencyPayment({
      destination: this.config.issuerAddress,
      amountDisplay: command.amountAtomic,
      memoRef: command.reference,
      context,
    });

    return this.submitTransaction('BURN', tx);
  }

  async getBalance(walletAddress: string): Promise<AdapterBalanceResult> {
    const response = await this.client.request({
      command: 'account_lines',
      account: walletAddress,
      peer: this.config.issuerAddress,
      ledger_index: 'validated',
    });

    const lines = (response.result as Record<string, unknown>)?.lines as Array<Record<string, unknown>> | undefined;
    const line = lines?.find((item) => item.currency === this.config.currencyCode);
    const balanceDisplay = String(line?.balance ?? '0');

    return {
      network: this.network,
      walletAddress,
      balanceAtomic: balanceDisplay,
      balanceDisplay,
    };
  }

  async getTotalSupply(): Promise<AdapterSupplyResult> {
    // XRPL issued currency supply is derived from issuer liabilities and trust lines.
    // We keep this method separate so the service API remains stable.
    return {
      network: this.network,
      totalSupplyAtomic: '0',
      totalSupplyDisplay: '0',
    };
  }

  async getTransaction(txHash: string): Promise<AdapterTxResult> {
    try {
      const response = await this.client.request({
        command: 'tx',
        transaction: txHash,
      });

      const result = response.result as Record<string, unknown>;
      const validated = Boolean(result?.validated);
      const meta = result?.meta as Record<string, unknown> | undefined;
      const status = this.mapEngineResultToStatus(String(meta?.TransactionResult ?? ''));

      return {
        network: this.network,
        txHash,
        status: validated ? status : 'PENDING',
        blockOrLedgerIndex: Number(result?.ledger_index ?? 0) || undefined,
        explorerUrl: this.toExplorerUrl(txHash),
        raw: result,
      };
    } catch (error: unknown) {
      this.logger.warn(`XRPL tx lookup failed for ${txHash}`);
      return {
        network: this.network,
        txHash,
        status: 'UNKNOWN',
        explorerUrl: this.toExplorerUrl(txHash),
      };
    }
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    return {
      network: this.network,
      connected: this.client.isConnected(),
      endpoint: this.config.wsUrl,
      details: {
        issuerAddress: this.config.issuerAddress,
        currencyCode: this.config.currencyCode,
      },
    };
  }

  private async submitTransaction(
    operation: 'MINT' | 'TRANSFER' | 'BURN',
    tx: Record<string, unknown>,
  ): Promise<AdapterSubmitResult> {
    await this.ensureConnected();

    const submitted = await this.client.submitAndWait(tx, {
      wallet: this.requireWallet(),
    });

    const result = submitted.result as Record<string, unknown>;
    const txHash = String(result?.hash ?? '');

    return {
      network: this.network,
      operation,
      status: txHash ? 'CONFIRMED' : 'SUBMITTED',
      txHash: txHash || undefined,
      providerSequence: String(result?.Sequence ?? ''),
      acceptedAt: new Date().toISOString(),
      errorCode: txHash ? undefined : 'XRPL_SUBMIT_UNKNOWN',
      errorMessage: txHash ? undefined : 'Transaction accepted without hash in response',
    };
  }

  private buildIssuedCurrencyPayment(input: {
    destination: string;
    amountDisplay: string;
    memoRef?: string;
    context: LedgerCommandContext;
  }): Record<string, unknown> {
    return {
      TransactionType: 'Payment',
      Account: this.wallet?.classicAddress ?? this.config.operationalWalletAddress,
      Destination: input.destination,
      Amount: {
        currency: this.config.currencyCode,
        issuer: this.config.issuerAddress,
        value: input.amountDisplay,
      },
      Memos: [
        {
          Memo: {
            MemoData: convertStringToHex(`ref:${input.memoRef ?? ''}`),
            MemoType: convertStringToHex('vaks-ref'),
            MemoFormat: convertStringToHex('text/plain'),
          },
        },
        {
          Memo: {
            MemoData: convertStringToHex(`idempotency:${input.context.idempotencyKey}`),
            MemoType: convertStringToHex('vaks-idempotency'),
            MemoFormat: convertStringToHex('text/plain'),
          },
        },
      ],
      // Required in production hardening:
      // 1) Set LastLedgerSequence from current ledger index + safety window.
      // 2) Tune Fee according to current network conditions.
      // 3) Add reliable retry policy for tef/ter codes and sequence gaps.
    };
  }

  private mapEngineResultToStatus(engineResult: string): AdapterTxResult['status'] {
    if (!engineResult) return 'UNKNOWN';
    if (engineResult === 'tesSUCCESS') return 'CONFIRMED';
    if (engineResult.startsWith('tec') || engineResult.startsWith('tef')) return 'FAILED';
    if (engineResult.startsWith('ter')) return 'PENDING';
    return 'UNKNOWN';
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
  }

  private requireWallet(): Wallet {
    if (!this.wallet) {
      throw new Error('XRPL operational wallet seed is required for submission');
    }

    return this.wallet;
  }

  private toExplorerUrl(txHash: string): string | undefined {
    if (!this.config.explorerBaseUrl) return undefined;
    return `${this.config.explorerBaseUrl.replace(/\/$/, '')}/${txHash}`;
  }

}
