import { toNano, Address, beginCell, Cell, contractAddress, StateInit } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { ChessToken } from '../wrappers/ChessToken';

/**
 * Deploy script for ChessToken Jetton contract
 * 
 * Usage: 
 *   Testnet: npx blueprint run deployChessToken --network testnet
 *   Mainnet: npx blueprint run deployChessToken --network mainnet
 */
export async function run(provider: NetworkProvider) {
    console.log('🚀 Deploying CHESS Token (Jetton) to TON Blockchain...\n');

    // Compile both contracts
    console.log('📦 Compiling contracts...');
    const jettonMasterCode = await compile('chess_token');
    const jettonWalletCode = await compile('jetton_wallet');
    console.log('✅ Contracts compiled successfully\n');

    // Get deployer address from provider
    const deployer = provider.sender().address;
    if (!deployer) {
        throw new Error('❌ No deployer address available. Check your wallet configuration.');
    }
    console.log('👤 Deployer address:', deployer.toString());

    // Create token metadata (offchain - points to our API)
    const metadataUrl = process.env.METADATA_URL || 'https://chessdao-production.up.railway.app/api/token/metadata';
    console.log('📋 Metadata URL:', metadataUrl);

    const content = beginCell()
        .storeUint(0x01, 8) // Offchain metadata flag (TEP-64)
        .storeStringTail(metadataUrl)
        .endCell();

    // Create initial contract data
    const initialData = beginCell()
        .storeCoins(0)          // total_supply = 0 initially
        .storeAddress(deployer) // admin = deployer
        .storeRef(content)      // metadata cell
        .storeRef(jettonWalletCode) // wallet code for user wallets
        .endCell();

    // Create state init
    const stateInit: StateInit = {
        code: jettonMasterCode,
        data: initialData,
    };

    // Calculate contract address deterministically
    const contractAddr = contractAddress(0, stateInit);
    console.log('📍 Calculated contract address:', contractAddr.toString());

    // Check if already deployed
    const isDeployed = await provider.isContractDeployed(contractAddr);
    if (isDeployed) {
        console.log('⚠️  Contract already deployed at this address!');
        console.log('   If you want to redeploy, change the initial data or code.\n');

        // Still useful to show the address
        console.log('🔗 Explorer Links:');
        console.log(`   Testnet: https://testnet.tonviewer.com/${contractAddr.toString()}`);
        console.log(`   Mainnet: https://tonviewer.com/${contractAddr.toString()}`);
        return;
    }

    // Create wrapper and deploy
    const chessToken = provider.open(new ChessToken(contractAddr, stateInit));

    console.log('\n💰 Sending deployment transaction...');
    console.log('   (This will deploy the contract and mint initial tokens to deployer)');

    // Deploy by sending mint message (also deploys the wallet for deployer)
    const initialMintAmount = toNano('1000000000'); // 1 billion CHESS tokens (with 9 decimals = 1B tokens)

    await chessToken.sendMint(provider.sender(), {
        toAddress: deployer,
        amount: initialMintAmount,
        queryId: Date.now(),
    });

    console.log('\n⏳ Waiting for deployment confirmation...');

    // Wait for deployment
    let attempts = 0;
    while (attempts < 30) {
        await sleep(2000);
        if (await provider.isContractDeployed(contractAddr)) {
            break;
        }
        attempts++;
        process.stdout.write('.');
    }

    console.log('\n');

    if (await provider.isContractDeployed(contractAddr)) {
        console.log('✅ CHESS Token deployed successfully!\n');

        // Verify deployment
        try {
            const supply = await chessToken.getTotalSupply();
            console.log('📊 Token Stats:');
            console.log(`   Total Supply: ${Number(supply) / 1e9} CHESS`);

            const admin = await chessToken.getAdminAddress();
            console.log(`   Admin: ${admin.toString()}`);
        } catch (e) {
            console.log('⚠️  Could not verify stats yet (blockchain may still be processing)');
        }

        console.log('\n🔗 Explorer Links:');
        console.log(`   Testnet: https://testnet.tonviewer.com/${contractAddr.toString()}`);
        console.log(`   Mainnet: https://tonviewer.com/${contractAddr.toString()}`);

        console.log('\n📝 IMPORTANT: Save this address in your .env file:');
        console.log(`   CHESS_TOKEN_ADDRESS=${contractAddr.toString()}`);
    } else {
        console.log('⚠️  Deployment may still be processing. Check the explorer for status.');
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
