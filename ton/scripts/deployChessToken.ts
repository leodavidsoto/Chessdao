import { toNano, Address, beginCell, Cell } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { ChessToken } from '../wrappers/ChessToken';

/**
 * Deploy script for ChessToken Jetton contract
 * 
 * Usage: npx blueprint run deploy
 */
export async function run(provider: NetworkProvider) {
    console.log('🚀 Deploying ChessToken Jetton...');

    // Compile contracts
    const jettonMasterCode = await compile('chess_token');
    const jettonWalletCode = await compile('jetton_wallet'); // Standard wallet code

    // Create token metadata (offchain)
    const content = beginCell()
        .storeUint(0x01, 8) // Offchain metadata flag
        .storeStringTail('https://chessdao-production.up.railway.app/api/token/metadata')
        .endCell();

    // Get deployer address
    const deployer = provider.sender().address;
    if (!deployer) {
        throw new Error('No deployer address available');
    }

    console.log('📦 Deployer:', deployer.toString());

    // Create initial state
    const initialData = beginCell()
        .storeCoins(0) // total_supply = 0
        .storeAddress(deployer) // admin = deployer
        .storeRef(content) // metadata
        .storeRef(jettonWalletCode) // wallet code
        .endCell();

    // Calculate contract address
    const stateInit = {
        code: jettonMasterCode,
        data: initialData,
    };

    const contractAddress = Address.parseRaw('0:..'); // Calculate from stateInit

    // Deploy
    const chessToken = provider.open(
        new ChessToken(contractAddress, stateInit)
    );

    // Send deploy transaction
    await chessToken.sendMint(provider.sender(), {
        toAddress: deployer,
        amount: toNano('1000000'), // Mint 1M tokens to deployer
    });

    console.log('✅ ChessToken deployed!');
    console.log('📍 Address:', contractAddress.toString());
    console.log('');
    console.log('🔗 Explorer:');
    console.log(`   Testnet: https://testnet.tonviewer.com/${contractAddress.toString()}`);
    console.log(`   Mainnet: https://tonviewer.com/${contractAddress.toString()}`);
}
