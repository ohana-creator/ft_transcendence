import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    fuji: {
      url: process.env.AVALANCHE_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc',
      chainId: 43113,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    hardhat: {},
  },
  etherscan: {
    apiKey: { avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY ?? '' },
  },
};

export default config;