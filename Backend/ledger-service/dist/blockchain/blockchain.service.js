"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BlockchainService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const fs_1 = require("fs");
const path_1 = require("path");
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
let BlockchainService = BlockchainService_1 = class BlockchainService {
    constructor() {
        this.logger = new common_1.Logger(BlockchainService_1.name);
    }
    async onModuleInit() {
        const rpcUrl = process.env.AVALANCHE_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc';
        const privKey = process.env.ADMIN_PRIVATE_KEY;
        const contractAddress = this.resolveContractAddress();
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.signer = new ethers_1.ethers.Wallet(privKey, this.provider);
        this.contract = new ethers_1.ethers.Contract(contractAddress, VAKS_ABI, this.signer);
        this.logger.log(`BlockchainService ready. Contract: ${contractAddress}`);
        this.logger.log(`Admin wallet: ${this.signer.address}`);
    }
    async getBalance(walletAddr) {
        const raw = await this.contract.balanceOf(walletAddr);
        return ethers_1.ethers.formatUnits(raw, 18);
    }
    async getTotalSupply() {
        const raw = await this.contract.totalSupply();
        return ethers_1.ethers.formatUnits(raw, 18);
    }
    async getTransaction(txHash) {
        const [tx, receipt] = await Promise.all([
            this.provider.getTransaction(txHash),
            this.provider.getTransactionReceipt(txHash),
        ]);
        if (!receipt)
            return null;
        return {
            hash: txHash,
            blockNumber: receipt.blockNumber,
            status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
            gasUsed: receipt.gasUsed.toString(),
            explorerUrl: `https://testnet.snowtrace.io/tx/${txHash}`,
        };
    }
    async mint(toAddr, amount, ref) {
        const amountWei = ethers_1.ethers.parseUnits(amount.toString(), 18);
        const tx = await this.contract.mint(toAddr, amountWei, ref);
        const receipt = await tx.wait();
        this.logger.log(`MINT ${amount} VAKS → ${toAddr} | tx: ${receipt.hash}`);
        return receipt.hash;
    }
    async transfer(toAddr, amount) {
        const amountWei = ethers_1.ethers.parseUnits(amount.toString(), 18);
        const tx = await this.contract.transfer(toAddr, amountWei);
        const receipt = await tx.wait();
        this.logger.log(`TRANSFER ${amount} VAKS → ${toAddr} | tx: ${receipt.hash}`);
        return receipt.hash;
    }
    async burn(fromAddr, amount, ref) {
        const amountWei = ethers_1.ethers.parseUnits(amount.toString(), 18);
        const tx = await this.contract.burn(fromAddr, amountWei, ref);
        const receipt = await tx.wait();
        this.logger.log(`BURN ${amount} VAKS from ${fromAddr} | tx: ${receipt.hash}`);
        return receipt.hash;
    }
    resolveContractAddress() {
        if (process.env.VAKS_CONTRACT_ADDRESS)
            return process.env.VAKS_CONTRACT_ADDRESS;
        const abiPath = (0, path_1.join)(process.cwd(), 'src/blockchain/abi.json');
        if ((0, fs_1.existsSync)(abiPath)) {
            const file = JSON.parse((0, fs_1.readFileSync)(abiPath, 'utf8'));
            return file.address;
        }
        throw new Error('VAKS_CONTRACT_ADDRESS not set and abi.json not found');
    }
};
exports.BlockchainService = BlockchainService;
exports.BlockchainService = BlockchainService = BlockchainService_1 = __decorate([
    (0, common_1.Injectable)()
], BlockchainService);
//# sourceMappingURL=blockchain.service.js.map