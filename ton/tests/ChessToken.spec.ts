import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import { ChessToken } from '../wrappers/ChessToken';
import '@ton/test-utils';

/**
 * ChessToken Contract Tests
 */
describe('ChessToken', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let chessToken: SandboxContract<ChessToken>;

    beforeEach(async () => {
        // Initialize blockchain sandbox
        blockchain = await Blockchain.create();

        // Create wallets
        deployer = await blockchain.treasury('deployer');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');

        // TODO: Deploy contract with compiled code
        // chessToken = blockchain.openContract(
        //     ChessToken.createFromConfig({
        //         admin: deployer.address,
        //         content: ...,
        //         walletCode: ...,
        //     })
        // );
    });

    describe('Deployment', () => {
        it('should deploy with zero supply', async () => {
            // const supply = await chessToken.getTotalSupply();
            // expect(supply).toBe(0n);
        });

        it('should set deployer as admin', async () => {
            // const admin = await chessToken.getAdminAddress();
            // expect(admin.equals(deployer.address)).toBe(true);
        });
    });

    describe('Minting', () => {
        it('should allow admin to mint tokens', async () => {
            // await chessToken.sendMint(deployer.getSender(), {
            //     toAddress: user1.address,
            //     amount: toNano('1000'),
            // });
            // 
            // const supply = await chessToken.getTotalSupply();
            // expect(supply).toBe(toNano('1000'));
        });

        it('should reject minting from non-admin', async () => {
            // const result = await chessToken.sendMint(user1.getSender(), {
            //     toAddress: user1.address,
            //     amount: toNano('1000'),
            // });
            // 
            // expect(result.transactions).toHaveTransaction({
            //     from: user1.address,
            //     to: chessToken.address,
            //     success: false,
            //     exitCode: 73, // Unauthorized
            // });
        });
    });

    describe('Transfers', () => {
        it('should transfer tokens between users', async () => {
            // First mint tokens to user1
            // Then transfer from user1 to user2
            // Verify balances
        });
    });

    describe('Admin', () => {
        it('should allow admin to change admin', async () => {
            // await chessToken.sendChangeAdmin(deployer.getSender(), {
            //     newAdmin: user1.address,
            // });
            // 
            // const newAdmin = await chessToken.getAdminAddress();
            // expect(newAdmin.equals(user1.address)).toBe(true);
        });
    });
});
