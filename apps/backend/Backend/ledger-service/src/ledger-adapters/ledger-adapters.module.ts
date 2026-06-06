import { Module } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module.js';
import { BlockchainService } from '../blockchain/blockchain.service.js';
import { EvmLedgerAdapter } from './evm/evm.adapter.js';
import { LEDGER_ADAPTER_TOKEN } from './ledger-adapter.interface.js';
import { XrplAdapter } from './xrpl/xrpl.adapter.js';
import { Client, Wallet } from 'xrpl';

function createXrplAdapter(): XrplAdapter {
  const wsUrl = process.env.XRPL_WS_URL ?? process.env.XRPL_RPC_URL ?? '';
  const issuerAddress = process.env.XRPL_ISSUER_ADDRESS ?? '';
  const currencyCode = process.env.XRPL_CURRENCY_CODE ?? 'VAKS';
  const operationalWalletAddress = process.env.XRPL_OPERATIONAL_WALLET_ADDRESS ?? '';
  const operationalWalletSeed = process.env.XRPL_OPERATIONAL_WALLET_SEED ?? '';
  const explorerBaseUrl = process.env.XRPL_EXPLORER_BASE_URL;

  const client = new Client(wsUrl, {
    feeCushion: Number(process.env.XRPL_FEE_CUSHION ?? 1.2),
    maxFeeXRP: process.env.XRPL_MAX_FEE_XRP ?? '2',
  });
  const wallet = operationalWalletSeed ? Wallet.fromSeed(operationalWalletSeed) : undefined;

  return new XrplAdapter(
    {
      wsUrl,
      issuerAddress,
      currencyCode,
      operationalWalletAddress,
      operationalWalletSeed,
      explorerBaseUrl,
    },
    client,
    wallet,
  );
}

@Module({
  imports: [BlockchainModule],
  providers: [
    EvmLedgerAdapter,
    {
      provide: LEDGER_ADAPTER_TOKEN,
      inject: [EvmLedgerAdapter],
      useFactory: (evmAdapter: EvmLedgerAdapter) => {
        const provider = (process.env.LEDGER_PROVIDER ?? 'EVM').toUpperCase();
        if (provider === 'XRPL') {
          return createXrplAdapter();
        }

        return evmAdapter;
      },
    },
  ],
  exports: [LEDGER_ADAPTER_TOKEN],
})
export class LedgerAdaptersModule {}