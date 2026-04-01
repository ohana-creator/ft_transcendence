import { ethers, run, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('🚀 Deploying VAKSToken...');
  console.log('   Network: ', network.name);
  console.log('   Deployer:', deployer.address);
  console.log('   Balance: ', ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  ), 'AVAX\n');

  const Factory  = await ethers.getContractFactory('VAKSToken');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('✅ VAKSToken deployed to:', address);
  console.log('   Snowtrace:', `https://testnet.snowtrace.io/address/${address}`);

  if (network.name === 'fuji') {
    console.log('\n⏳ Waiting for confirmations...');
    await contract.deploymentTransaction()?.wait(5);
    try {
      await run('verify:verify', { address, constructorArguments: [] });
      console.log('✅ Verified on Snowtrace');
    } catch (e: any) {
      if (!e.message.includes('Already Verified')) console.error('Verify error:', e.message);
    }
  }

  // Salva ABI + address para o ledger-service
  const artifact = {
    address,
    network: network.name,
    chainId: network.name === 'fuji' ? 43113 : 31337,
    abi: JSON.parse(contract.interface.formatJson()),
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '../../ledger-service/src/blockchain/abi.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log('\n📄 ABI + address saved to ledger-service/src/blockchain/abi.json');
}

main().catch((e) => { console.error(e); process.exit(1); });