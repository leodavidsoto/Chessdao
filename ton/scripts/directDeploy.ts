/**
 * Direct Deploy Script for CHESS Token
 * Uses WalletContractV3R2 for Tonkeeper compatibility
 */

import { TonClient, WalletContractV3R2, internal, toNano, beginCell, Cell, contractAddress, StateInit, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('🚀 Direct Deploy - CHESS Token to TON Mainnet\n');

    // Load mnemonic from .env
    require('dotenv').config();
    const mnemonic = process.env.WALLET_MNEMONIC;

    if (!mnemonic) {
        throw new Error('❌ WALLET_MNEMONIC not found in .env');
    }

    // Setup client for mainnet
    const client = new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TONCENTER_API_KEY || undefined,
    });

    console.log('🔗 Connected to TON Mainnet');

    // Load wallet from mnemonic - Using V3R2 (Tonkeeper default)
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));

    // Try V3R2 first (most common for Tonkeeper)
    const wallet = WalletContractV3R2.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });

    const walletContract = client.open(wallet);
    const walletAddress = wallet.address;

    console.log('👤 Wallet V3R2 address:', walletAddress.toString());
    console.log('   User-friendly:', walletAddress.toString({ bounceable: true }));

    // Check balance
    const balance = await walletContract.getBalance();
    console.log('💰 Wallet balance:', Number(balance) / 1e9, 'TON\n');

    if (balance < toNano('0.5')) {
        throw new Error('❌ Insufficient balance. Need at least 0.5 TON');
    }

    // Load compiled contracts
    const chessTokenCompiled = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../build/ChessToken.compiled.json'), 'utf-8')
    );
    const jettonWalletCompiled = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../build/JettonWallet.compiled.json'), 'utf-8')
    );

    const jettonMasterCode = Cell.fromBoc(Buffer.from(chessTokenCompiled.hex, 'hex'))[0];
    const jettonWalletCode = Cell.fromBoc(Buffer.from(jettonWalletCompiled.hex, 'hex'))[0];

    console.log('📦 Loaded compiled contracts');

    // Create metadata
    const metadataUrl = 'https://chessdao-production.up.railway.app/api/token/metadata';
    const content = beginCell()
        .storeUint(0x01, 8) // Offchain metadata
        .storeStringTail(metadataUrl)
        .endCell();

    // Create initial data
    const initialData = beginCell()
        .storeCoins(0)          // total_supply = 0
        .storeAddress(walletAddress) // admin = deployer
        .storeRef(content)      // metadata
        .storeRef(jettonWalletCode) // wallet code
        .endCell();

    // Create state init
    const stateInit: StateInit = {
        code: jettonMasterCode,
        data: initialData,
    };

    // Calculate contract address
    const tokenAddress = contractAddress(0, stateInit);
    console.log('📍 Token contract address:', tokenAddress.toString());

    // Check if already deployed
    const contractState = await client.getContractState(tokenAddress);
    if (contractState.state === 'active') {
        console.log('⚠️  Contract already deployed!');
        console.log('🔗 View: https://tonviewer.com/' + tokenAddress.toString());
        return;
    }

    // Build mint message
    const mintAmount = toNano('1000000000'); // 1 billion tokens
    const mintBody = beginCell()
        .storeUint(0x15, 32)  // op::mint
        .storeUint(Date.now(), 64) // query_id
        .storeAddress(walletAddress) // to_address
        .storeCoins(mintAmount) // amount
        .endCell();

    // Deploy
    console.log('\n💰 Sending deploy transaction...');
    console.log('   Minting 1,000,000,000 CHESS tokens to your wallet\n');

    const seqno = await walletContract.getSeqno();

    await walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [
            internal({
                to: tokenAddress,
                value: toNano('0.5'), // 0.5 TON for deploy + mint
                init: stateInit,
                body: mintBody,
            })
        ]
    });

    console.log('⏳ Waiting for confirmation...');

    // Wait for deployment
    let attempts = 0;
    while (attempts < 30) {
        await sleep(2000);
        const state = await client.getContractState(tokenAddress);
        if (state.state === 'active') {
            console.log('\n✅ CHESS Token deployed successfully!\n');
            console.log('📍 Contract Address:', tokenAddress.toString());
            console.log('🔗 View on Explorer: https://tonviewer.com/' + tokenAddress.toString());
            console.log('\n📝 Add this to your .env:');
            console.log(`   CHESS_TOKEN_ADDRESS=${tokenAddress.toString()}`);
            return;
        }
        attempts++;
        process.stdout.write('.');
    }

    console.log('\n⚠️  Deployment may still be processing. Check explorer.');
    console.log('🔗 https://tonviewer.com/' + tokenAddress.toString());
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
