import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from '../../blockchain/blockchain.service.js';
import {
  AdapterBalanceResult,
  AdapterHealthResult,
  AdapterSubmitResult,
  AdapterSupplyResult,
  AdapterTxResult,
  BurnCommand,
  LedgerCommandContext,
  LedgerOperation,
  MintCommand,
  TransferCommand,
} from '../ledger-adapter.types.js';
import { LedgerAdapter } from '../ledger-adapter.interface.js';

@Injectable()
export class EvmLedgerAdapter implements LedgerAdapter {
  public readonly network = 'EVM' as const;

  constructor(private readonly blockchain: BlockchainService) {}

  async mint(command: MintCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult> {
    const txHash = await this.blockchain.mint(
      command.toAddress,
      Number(command.amountAtomic),
      command.reference ?? context.idempotencyKey,
    );

    return this.buildConfirmedResult('MINT', txHash);
  }

  async transfer(command: TransferCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult> {
    const txHash = await this.blockchain.transfer(
      command.toAddress,
      Number(command.amountAtomic),
    );

    return this.buildConfirmedResult('TRANSFER', txHash);
  }

  async burn(command: BurnCommand, context: LedgerCommandContext): Promise<AdapterSubmitResult> {
    const txHash = await this.blockchain.burn(
      command.fromAddress,
      Number(command.amountAtomic),
      command.reference ?? context.idempotencyKey,
    );

    return this.buildConfirmedResult('BURN', txHash);
  }

  async getBalance(walletAddress: string): Promise<AdapterBalanceResult> {
    const balanceDisplay = await this.blockchain.getBalance(walletAddress);
    return {
      network: this.network,
      walletAddress,
      balanceAtomic: ethers.parseUnits(balanceDisplay, 18).toString(),
      balanceDisplay,
    };
  }

  async getTotalSupply(): Promise<AdapterSupplyResult> {
    const totalSupplyDisplay = await this.blockchain.getTotalSupply();
    return {
      network: this.network,
      totalSupplyAtomic: ethers.parseUnits(totalSupplyDisplay, 18).toString(),
      totalSupplyDisplay,
    };
  }

  async getTransaction(txHash: string): Promise<AdapterTxResult> {
    const tx = await this.blockchain.getTransaction(txHash);
    if (!tx) {
      return {
        network: this.network,
        txHash,
        status: 'PENDING',
      };
    }

    return {
      network: this.network,
      txHash,
      status: tx.status,
      blockOrLedgerIndex: tx.blockNumber,
      feeAtomic: tx.gasUsed,
      explorerUrl: tx.explorerUrl,
      raw: tx,
    };
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    return {
      network: this.network,
      connected: true,
      endpoint: process.env.AVALANCHE_RPC_URL,
    };
  }

  private buildConfirmedResult(operation: LedgerOperation, txHash: string): AdapterSubmitResult {
    return {
      network: this.network,
      operation,
      status: 'CONFIRMED',
      txHash,
      acceptedAt: new Date().toISOString(),
    };
  }
}