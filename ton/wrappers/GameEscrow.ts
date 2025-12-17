import { Contract, ContractProvider, Sender, Address, Cell, beginCell, toNano } from '@ton/core';

/**
 * GameEscrow wrapper - Type-safe interface for chess betting escrow
 */
export class GameEscrow implements Contract {
    static readonly STATES = {
        WAITING: 0,
        ACTIVE: 1,
        SETTLED: 2,
        CANCELLED: 3,
    };

    static readonly OPS = {
        SETTLE_GAME: 0x03,
        CANCEL_GAME: 0x04,
    };

    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) { }

    static createFromAddress(address: Address): GameEscrow {
        return new GameEscrow(address);
    }

    /**
     * Create new escrow for a game
     */
    static createFromConfig(config: {
        gameId: bigint;
        creator: Address;
        opponent: Address;
        betAmount: bigint;
        arbiter: Address;
        jettonWallet: Address;
    }): GameEscrow {
        const data = beginCell()
            .storeUint(config.gameId, 64)
            .storeUint(0, 8) // STATE_WAITING
            .storeAddress(config.creator)
            .storeAddress(config.opponent)
            .storeCoins(config.betAmount)
            .storeAddress(config.arbiter)
            .storeAddress(config.jettonWallet)
            .storeUint(0, 1) // creator_deposited = false
            .storeUint(0, 1) // opponent_deposited = false
            .endCell();

        const code = Cell.EMPTY; // Replace with compiled code

        return new GameEscrow(
            Address.parseRaw('0:0000000000000000000000000000000000000000000000000000000000000000'),
            { code, data }
        );
    }

    /**
     * Get game information
     */
    async getGameInfo(provider: ContractProvider): Promise<{
        gameId: bigint;
        state: number;
        creator: Address;
        opponent: Address;
        betAmount: bigint;
        creatorDeposited: boolean;
        opponentDeposited: boolean;
    }> {
        const result = await provider.get('get_game_info', []);
        return {
            gameId: result.stack.readBigNumber(),
            state: result.stack.readNumber(),
            creator: result.stack.readAddress(),
            opponent: result.stack.readAddress(),
            betAmount: result.stack.readBigNumber(),
            creatorDeposited: result.stack.readNumber() !== 0,
            opponentDeposited: result.stack.readNumber() !== 0,
        };
    }

    /**
     * Get current pot amount
     */
    async getPot(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('get_pot', []);
        return result.stack.readBigNumber();
    }

    /**
     * Settle game - send pot to winner (arbiter only)
     */
    async sendSettle(
        provider: ContractProvider,
        via: Sender,
        opts: {
            winner: Address;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.1'),
            body: beginCell()
                .storeUint(GameEscrow.OPS.SETTLE_GAME, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(opts.winner)
                .endCell(),
        });
    }

    /**
     * Cancel game - refund creator (creator or arbiter only)
     */
    async sendCancel(
        provider: ContractProvider,
        via: Sender,
        opts: {
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            body: beginCell()
                .storeUint(GameEscrow.OPS.CANCEL_GAME, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .endCell(),
        });
    }
}
