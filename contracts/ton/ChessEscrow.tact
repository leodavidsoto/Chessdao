// ChessDAO Game Escrow Contract for TON
// Written in Tact (TON's modern smart contract language)
//
// This contract handles:
// - Game creation with bet deposits
// - Player matching
// - Winner payout with DAO fee
// - Draw refunds
// - Creator cancellation of unmatched games
// - Timeout claims for stalled games
//
// SECURITY NOTE: this contract must undergo a professional third-party audit
// before holding real value on mainnet. In particular, payout gas accounting
// and message-bounce handling should be reviewed under adversarial conditions.

import "@stdlib/deploy";

// Send mode: pay gas separately from the transferred value and BOUNCE the
// message back to the contract if the action fails, instead of silently
// dropping the funds (the previous `SendIgnoreErrors` could lose a payout with
// no trace if the destination was uninitialized or rejected the message).
const SAFE_SEND_MODE: Int = SendPayGasSeparately;

// Game status codes
const STATUS_WAITING: Int = 0;
const STATUS_ACTIVE: Int = 1;
const STATUS_COMPLETED: Int = 2;
const STATUS_CANCELLED: Int = 3;

// A stalled active game can be claimed after this many seconds.
const TIMEOUT_SECONDS: Int = 1800; // 30 minutes

message CreateGame {
    gameId: Int as uint64;
    betAmount: Int as coins;
    timeControl: Int as uint32;  // minutes
}

message JoinGame {
    gameId: Int as uint64;
}

message EndGame {
    gameId: Int as uint64;
    winner: Address;  // winner address (ignored when isDraw is true)
    isDraw: Bool;
}

message CancelGame {
    gameId: Int as uint64;
}

message ClaimTimeout {
    gameId: Int as uint64;
}

struct Game {
    gameId: Int as uint64;
    player1: Address;
    player2: Address?;
    betAmount: Int as coins;
    timeControl: Int as uint32;
    status: Int as uint8;
    createdAt: Int as uint64;
    startedAt: Int as uint64;
}

contract ChessEscrow with Deployable {
    owner: Address;
    daoFeePercent: Int as uint8;  // Fee in percent (e.g., 3 = 3%)
    daoTreasury: Address;
    totalGamesPlayed: Int as uint64;
    totalVolume: Int as coins;

    // Games storage
    games: map<Int, Game>;

    init(daoTreasury: Address) {
        self.owner = sender();
        self.daoFeePercent = 3;  // 3% DAO fee
        self.daoTreasury = daoTreasury;
        self.totalGamesPlayed = 0;
        self.totalVolume = 0;
    }

    // Create a new game with bet
    receive(msg: CreateGame) {
        let ctx: Context = context();
        require(ctx.value >= msg.betAmount, "Insufficient funds");
        require(msg.betAmount >= ton("0.1"), "Minimum bet is 0.1 TON");
        // Reject duplicate game ids so an existing (possibly funded) game cannot
        // be silently overwritten.
        require(self.games.get(msg.gameId) == null, "Game id already exists");

        let game = Game{
            gameId: msg.gameId,
            player1: sender(),
            player2: null,
            betAmount: msg.betAmount,
            timeControl: msg.timeControl,
            status: STATUS_WAITING,
            createdAt: now(),
            startedAt: 0
        };

        self.games.set(msg.gameId, game);

        // Return excess funds
        let excess = ctx.value - msg.betAmount;
        if (excess > 0) {
            send(SendParameters{
                to: sender(),
                value: excess,
                mode: SAFE_SEND_MODE,
                bounce: false
            });
        }
    }

    // Join an existing game
    receive(msg: JoinGame) {
        let ctx: Context = context();
        let gameOpt = self.games.get(msg.gameId);
        require(gameOpt != null, "Game not found");

        let game = gameOpt!!;
        require(game.status == STATUS_WAITING, "Game not available");
        require(game.player1 != sender(), "Cannot join own game");
        require(ctx.value >= game.betAmount, "Insufficient bet amount");

        // Update game
        game.player2 = sender();
        game.status = STATUS_ACTIVE;
        game.startedAt = now();
        self.games.set(msg.gameId, game);

        // Return excess funds
        let excess = ctx.value - game.betAmount;
        if (excess > 0) {
            send(SendParameters{
                to: sender(),
                value: excess,
                mode: SAFE_SEND_MODE,
                bounce: false
            });
        }

        self.totalGamesPlayed = self.totalGamesPlayed + 1;
        self.totalVolume = self.totalVolume + (game.betAmount * 2);
    }

    // End game and distribute funds
    receive(msg: EndGame) {
        // Only owner (trusted backend/oracle) can end games
        require(sender() == self.owner, "Unauthorized");

        let gameOpt = self.games.get(msg.gameId);
        require(gameOpt != null, "Game not found");

        let game = gameOpt!!;
        require(game.status == STATUS_ACTIVE, "Game not active");
        require(game.player2 != null, "Game not started");

        let totalPot = game.betAmount * 2;
        let daoFee = totalPot * self.daoFeePercent / 100;
        let prize = totalPot - daoFee;

        // Mark the game completed BEFORE sending funds so a re-entrant or
        // duplicated EndGame cannot pay out twice.
        game.status = STATUS_COMPLETED;
        self.games.set(msg.gameId, game);

        if (msg.isDraw) {
            // Split the net pot evenly between the two players.
            let refund = prize / 2;
            send(SendParameters{
                to: game.player1,
                value: refund,
                mode: SAFE_SEND_MODE,
                bounce: false
            });
            send(SendParameters{
                to: game.player2!!,
                value: refund,
                mode: SAFE_SEND_MODE,
                bounce: false
            });
        } else {
            // The winner MUST be one of the two players. Without this check the
            // owner could direct the entire pot to any arbitrary address.
            require(
                msg.winner == game.player1 || msg.winner == game.player2!!,
                "Winner must be a participant"
            );
            send(SendParameters{
                to: msg.winner,
                value: prize,
                mode: SAFE_SEND_MODE,
                bounce: false
            });
        }

        // Send DAO fee to treasury
        send(SendParameters{
            to: self.daoTreasury,
            value: daoFee,
            mode: SAFE_SEND_MODE,
            bounce: false
        });
    }

    // Cancel a waiting game and refund the creator.
    receive(msg: CancelGame) {
        let gameOpt = self.games.get(msg.gameId);
        require(gameOpt != null, "Game not found");

        let game = gameOpt!!;
        require(game.status == STATUS_WAITING, "Game not cancellable");
        // Only the creator (or the owner) may cancel an unmatched game.
        require(sender() == game.player1 || sender() == self.owner, "Unauthorized");

        game.status = STATUS_CANCELLED;
        self.games.set(msg.gameId, game);

        send(SendParameters{
            to: game.player1,
            value: game.betAmount,
            mode: SAFE_SEND_MODE,
            bounce: false
        });
    }

    // Claim a stalled active game after the timeout window. A participant may
    // claim the net pot; the DAO fee is still taken. Ideally the owner/oracle
    // settles games via EndGame; this is a safety valve if it goes offline.
    receive(msg: ClaimTimeout) {
        let gameOpt = self.games.get(msg.gameId);
        require(gameOpt != null, "Game not found");

        let game = gameOpt!!;
        require(game.status == STATUS_ACTIVE, "Game not active");
        require(game.player2 != null, "Game not started");
        require(
            sender() == game.player1 || sender() == game.player2!!,
            "Not a participant"
        );
        require(now() - game.startedAt >= TIMEOUT_SECONDS, "Timeout not reached");

        let totalPot = game.betAmount * 2;
        let daoFee = totalPot * self.daoFeePercent / 100;
        let prize = totalPot - daoFee;

        game.status = STATUS_COMPLETED;
        self.games.set(msg.gameId, game);

        send(SendParameters{
            to: sender(),
            value: prize,
            mode: SAFE_SEND_MODE,
            bounce: false
        });
        send(SendParameters{
            to: self.daoTreasury,
            value: daoFee,
            mode: SAFE_SEND_MODE,
            bounce: false
        });
    }

    // View functions
    get fun getGame(gameId: Int): Game? {
        return self.games.get(gameId);
    }

    get fun getDaoFee(): Int {
        return self.daoFeePercent;
    }

    get fun getTotalGames(): Int {
        return self.totalGamesPlayed;
    }

    get fun getTotalVolume(): Int {
        return self.totalVolume;
    }
}
