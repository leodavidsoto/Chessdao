import { toNano, Address, beginCell, Cell, contractAddress, StateInit } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { GameEscrow } from '../wrappers/GameEscrow';

/**
 * Deploy script for GameEscrow contract
 * 
 * This deploys a new escrow contract for a specific game.
 * Each game needs its own escrow contract.
 * 
 * Usage: npx blueprint run deployGameEscrow --network testnet
 */
export async function run(provider: NetworkProvider) {
    console.log('🎮 Deploying Game Escrow Contract...\n');

    // Compile contract
    console.log('📦 Compiling game_escrow.fc...');
    const escrowCode = await compile('game_escrow');
    console.log('✅ Contract compiled\n');

    // Get addresses from environment or use defaults for testing
    const deployer = provider.sender().address;
    if (!deployer) {
        throw new Error('❌ No deployer address');
    }

    // Example game configuration - in production, these come from API
    const gameConfig = {
        gameId: BigInt(Date.now()),  // Unique game ID
        creator: deployer,            // Game creator
        opponent: deployer,           // Opponent (same for testing, different in production)
        betAmount: toNano('100'),     // 100 CHESS tokens bet
        arbiter: deployer,            // Arbiter (our server in production)
        jettonWallet: Address.parse(process.env.CHESS_TOKEN_ADDRESS || 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
    };

    console.log('📋 Game Configuration:');
    console.log(`   Game ID: ${gameConfig.gameId}`);
    console.log(`   Creator: ${gameConfig.creator.toString()}`);
    console.log(`   Bet Amount: ${Number(gameConfig.betAmount) / 1e9} CHESS`);
    console.log(`   Arbiter: ${gameConfig.arbiter.toString()}`);

    // Create initial data
    const initialData = beginCell()
        .storeUint(gameConfig.gameId, 64)
        .storeUint(0, 8)  // STATE_WAITING
        .storeAddress(gameConfig.creator)
        .storeAddress(gameConfig.opponent)
        .storeCoins(gameConfig.betAmount)
        .storeAddress(gameConfig.arbiter)
        .storeAddress(gameConfig.jettonWallet)
        .storeUint(0, 1)  // creator_deposited = false
        .storeUint(0, 1)  // opponent_deposited = false
        .endCell();

    const stateInit: StateInit = {
        code: escrowCode,
        data: initialData,
    };

    const escrowAddress = contractAddress(0, stateInit);
    console.log(`\n📍 Escrow Address: ${escrowAddress.toString()}`);

    // Check if deployed
    if (await provider.isContractDeployed(escrowAddress)) {
        console.log('⚠️  Escrow already deployed!');
        return;
    }

    // Deploy
    const escrow = provider.open(new GameEscrow(escrowAddress, stateInit));

    // Send minimal TON to deploy
    await provider.sender().send({
        to: escrowAddress,
        value: toNano('0.1'),
        init: stateInit,
    });

    console.log('\n⏳ Waiting for deployment...');

    let attempts = 0;
    while (attempts < 20) {
        await sleep(2000);
        if (await provider.isContractDeployed(escrowAddress)) {
            break;
        }
        attempts++;
    }

    if (await provider.isContractDeployed(escrowAddress)) {
        console.log('✅ Game Escrow deployed successfully!');
        console.log(`\n🔗 https://testnet.tonviewer.com/${escrowAddress.toString()}`);
    } else {
        console.log('⚠️  Deployment pending...');
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
