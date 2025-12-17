import { Contract, ContractProvider, Sender, Address, Cell, beginCell, toNano } from '@ton/core';

/**
 * ChessToken wrapper - Type-safe interface for the CHESS Jetton contract
 */
export class ChessToken implements Contract {
    static readonly OPS = {
        MINT: 0x15,
        CHANGE_ADMIN: 0x6501f354,
    };

    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) { }

    /**
     * Create wrapper from address
     */
    static createFromAddress(address: Address): ChessToken {
        return new ChessToken(address);
    }

    /**
     * Create wrapper with initial deploy config
     */
    static createFromConfig(config: {
        admin: Address;
        content: Cell;
        walletCode: Cell;
    }): ChessToken {
        const data = beginCell()
            .storeCoins(0) // total_supply starts at 0
            .storeAddress(config.admin)
            .storeRef(config.content)
            .storeRef(config.walletCode)
            .endCell();

        // Note: code cell would be loaded from compiled contract
        const code = Cell.EMPTY; // Replace with actual compiled code

        return new ChessToken(
            // Calculate contract address from state init
            Address.parseRaw('0:0000000000000000000000000000000000000000000000000000000000000000'),
            { code, data }
        );
    }

    /**
     * Get total token supply
     */
    async getTotalSupply(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('get_total_supply', []);
        return result.stack.readBigNumber();
    }

    /**
     * Get admin address
     */
    async getAdminAddress(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('get_admin_address', []);
        return result.stack.readAddress();
    }

    /**
     * Get jetton data (for indexers/explorers)
     */
    async getJettonData(provider: ContractProvider): Promise<{
        totalSupply: bigint;
        mintable: boolean;
        adminAddress: Address;
        content: Cell;
        walletCode: Cell;
    }> {
        const result = await provider.get('get_jetton_data', []);
        return {
            totalSupply: result.stack.readBigNumber(),
            mintable: result.stack.readNumber() !== 0,
            adminAddress: result.stack.readAddress(),
            content: result.stack.readCell(),
            walletCode: result.stack.readCell(),
        };
    }

    /**
     * Get user's jetton wallet address
     */
    async getWalletAddress(
        provider: ContractProvider,
        ownerAddress: Address
    ): Promise<Address> {
        const result = await provider.get('get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() },
        ]);
        return result.stack.readAddress();
    }

    /**
     * Mint tokens to an address (admin only)
     */
    async sendMint(
        provider: ContractProvider,
        via: Sender,
        opts: {
            toAddress: Address;
            amount: bigint;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.1'), // Gas for minting
            body: beginCell()
                .storeUint(ChessToken.OPS.MINT, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(opts.toAddress)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }

    /**
     * Change admin address (admin only)
     */
    async sendChangeAdmin(
        provider: ContractProvider,
        via: Sender,
        opts: {
            newAdmin: Address;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            body: beginCell()
                .storeUint(ChessToken.OPS.CHANGE_ADMIN, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(opts.newAdmin)
                .endCell(),
        });
    }
}
