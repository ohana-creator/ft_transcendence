import { OnModuleInit } from '@nestjs/common';
export declare class BlockchainService implements OnModuleInit {
    private readonly logger;
    private provider;
    private signer;
    private contract;
    onModuleInit(): Promise<void>;
    getBalance(walletAddr: string): Promise<string>;
    getTotalSupply(): Promise<string>;
    getTransaction(txHash: string): Promise<{
        hash: string;
        blockNumber: number;
        status: string;
        gasUsed: string;
        explorerUrl: string;
    }>;
    mint(toAddr: string, amount: number, ref: string): Promise<string>;
    transfer(toAddr: string, amount: number): Promise<string>;
    burn(fromAddr: string, amount: number, ref: string): Promise<string>;
    private resolveContractAddress;
}
