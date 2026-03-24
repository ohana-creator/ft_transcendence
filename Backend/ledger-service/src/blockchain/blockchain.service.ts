import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AbiFile {
  address: string;
  abi:     any[];
}

const VAKS_ABI = [
  'function mint(address to, uint256 amount, string ref) external',
  'function burn(address from, uint256 amount, string ref) external',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function admin() external view returns (address)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Mint(address indexed to, uint256 value, string ref)',
  'event Burn(address indexed from, uint256 value, string ref)',
];

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);

  private provider: ethers.JsonRpcProvider;
  private signer?:  ethers.Wallet;
  private contract: ethers.Contract;
  private canWrite = false;

  async onModuleInit() {
    const rpcUrl  = process.env.AVALANCHE_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc';
    const contractAddress = this.resolveContractAddress();

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, VAKS_ABI, this.provider);

    const privKey = this.resolveAdminPrivateKey();
    if (privKey) {
      this.signer = new ethers.Wallet(privKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, VAKS_ABI, this.signer);
      this.canWrite = true;
      this.logger.log(`Admin wallet: ${this.signer.address}`);
    } else {
      this.canWrite = false;
      this.logger.warn('ADMIN_PRIVATE_KEY missing/invalid: blockchain writes disabled (read-only mode)');
    }

    this.logger.log(`BlockchainService ready. Contract: ${contractAddress}`);
  }

  // ─── Read ────────────────────────────────────────────────

  async getBalance(walletAddr: string): Promise<string> {
    const raw = await this.contract.balanceOf(walletAddr);
    return ethers.formatUnits(raw, 18);
  }

  async getTotalSupply(): Promise<string> {
    const raw = await this.contract.totalSupply();
    return ethers.formatUnits(raw, 18);
  }

  async getTransaction(txHash: string) {
    const [tx, receipt] = await Promise.all([
      this.provider.getTransaction(txHash),
      this.provider.getTransactionReceipt(txHash),
    ]);
    if (!receipt) return null;
    return {
      hash:        txHash,
      blockNumber: receipt.blockNumber,
      status:      receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
      gasUsed:     receipt.gasUsed.toString(),
      explorerUrl: `https://testnet.snowtrace.io/tx/${txHash}`,
    };
  }

  // ─── Write ───────────────────────────────────────────────

  async mint(toAddr: string, amount: number, ref: string): Promise<string> {
    this.ensureWriteEnabled();
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const tx        = await this.contract.mint(toAddr, amountWei, ref);
    const receipt   = await tx.wait();
    this.logger.log(`MINT ${amount} VAKS → ${toAddr} | tx: ${receipt.hash}`);
    return receipt.hash;
  }

  async transfer(toAddr: string, amount: number): Promise<string> {
    this.ensureWriteEnabled();
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const tx        = await this.contract.transfer(toAddr, amountWei);
    const receipt   = await tx.wait();
    this.logger.log(`TRANSFER ${amount} VAKS → ${toAddr} | tx: ${receipt.hash}`);
    return receipt.hash;
  }

  async burn(fromAddr: string, amount: number, ref: string): Promise<string> {
    this.ensureWriteEnabled();
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const tx        = await this.contract.burn(fromAddr, amountWei, ref);
    const receipt   = await tx.wait();
    this.logger.log(`BURN ${amount} VAKS from ${fromAddr} | tx: ${receipt.hash}`);
    return receipt.hash;
  }

  // ─── Helpers ─────────────────────────────────────────────

  private resolveContractAddress(): string {
    // 1. Var de ambiente (Docker)
    if (process.env.VAKS_CONTRACT_ADDRESS) return process.env.VAKS_CONTRACT_ADDRESS;

    // 2. ABI file gerado pelo deploy script
    const abiPath = join(process.cwd(), 'src/blockchain/abi.json');
    if (existsSync(abiPath)) {
      const file = JSON.parse(readFileSync(abiPath, 'utf8')) as AbiFile;
      return file.address;
    }

    throw new Error('VAKS_CONTRACT_ADDRESS not set and abi.json not found');
  }

  private resolveAdminPrivateKey(): string | null {
    const file = process.env.ADMIN_PRIVATE_KEY_FILE;
    const fromFile = file && existsSync(file) ? readFileSync(file, 'utf8').trim() : '';
    const candidate = (fromFile || process.env.ADMIN_PRIVATE_KEY || '').trim();

    if (!candidate) return null;
    try {
      return ethers.SigningKey.computePublicKey(candidate) ? candidate : null;
    } catch {
      return null;
    }
  }

  private ensureWriteEnabled() {
    if (!this.canWrite) {
      throw new Error('Blockchain write disabled: configure ADMIN_PRIVATE_KEY (or ADMIN_PRIVATE_KEY_FILE)');
    }
  }
}