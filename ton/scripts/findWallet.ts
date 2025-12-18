/**
 * Find correct wallet version for the mnemonic
 */

import { TonClient, WalletContractV3R1, WalletContractV3R2, WalletContractV4, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

async function main() {
    require('dotenv').config();
    const mnemonic = process.env.WALLET_MNEMONIC;

    if (!mnemonic) {
        throw new Error('No mnemonic');
    }

    const targetAddress = 'UQCYlChNVp9_lUF0CDZ45_zOr3g-iztsQMwsMTTxDY1abi8J';
    console.log('🎯 Looking for wallet:', targetAddress, '\n');

    const client = new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    });

    const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));

    // Test all wallet versions
    const versions = [
        { name: 'V3R1', factory: () => WalletContractV3R1.create({ workchain: 0, publicKey: keyPair.publicKey }) },
        { name: 'V3R2', factory: () => WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey }) },
        { name: 'V4R1 (subwallet 0)', factory: () => WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey, walletId: 0 }) },
        { name: 'V4R2 (subwallet 698983191)', factory: () => WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey, walletId: 698983191 }) },
        { name: 'V4R2 (default)', factory: () => WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }) },
    ];

    for (const v of versions) {
        const wallet = v.factory();
        const addr = wallet.address.toString({ bounceable: false });
        const addrBounce = wallet.address.toString({ bounceable: true });

        let balance = '?';
        try {
            const contract = client.open(wallet);
            const bal = await contract.getBalance();
            balance = (Number(bal) / 1e9).toFixed(2) + ' TON';
        } catch (e) {
            balance = 'error';
        }

        const match = addr === targetAddress || addrBounce === targetAddress ? '✅ MATCH!' : '';
        console.log(`${v.name}:`);
        console.log(`  Address: ${addr}`);
        console.log(`  Bounceable: ${addrBounce}`);
        console.log(`  Balance: ${balance} ${match}`);
        console.log();
    }
}

main().catch(console.error);
