// ChessDAO Game Escrow Contract for TON
// Written in Tact (TON's modern smart contract language)
// 
// This contract handles:
// - Game creation with bet deposits
// - Player matching
// - Winner payout with DAO fee
// - Draw refunds

import "@stdlib/deploy";

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
    winner: Address;  // winner address or special value for draw
    isDraw: Bool;
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
    status: Int as uint8;  // 0=waiting, 1=active, 2=completed, 3=cancelled
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
        
        let game = Game{
            gameId: msg.gameId,
            player1: sender(),
            player2: null,
            betAmount: msg.betAmount,
            timeControl: msg.timeControl,
            status: 0,  // waiting
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
                mode: SendIgnoreErrors
            });
        }
    }
    
    // Join an existing game
    receive(msg: JoinGame) {
        let ctx: Context = context();
        let gameOpt = self.games.get(msg.gameId);
        require(gameOpt != null, "Game not found");
        
        let game = gameOpt!!;
        require(game.status == 0, "Game not available");
        require(game.player1 != sender(), "Cannot join own game");
        require(ctx.value >= game.betAmount, "Insufficient bet amount");
        
        // Update game
        game.player2 = sender();
        game.status = 1;  // active
        game.startedAt = now();
        self.games.set(msg.gameId, game);
        
        // Return excess funds
        let excess = ctx.value - game.betAmount;
        if (excess > 0) {
            send(SendParameters{
                to: sender(),
                value: excess,
                mode: SendIgnoreErrors
            });
        }
        
        self.totalGamesPlayed = self.totalGamesPlayed + 1;
        self.totalVolume = self.totalVolume + (game.betAmount * 2);
    }
    
    // End game and distribute funds
    receive(msg: EndGame) {
        // Only owner (backend) can end games
        require(sender() == self.owner, "Unauthorized");
        
        let gameOpt = self.games.get(msg.gameId);
        require(gameOpt != null, "Game not found");
        
        let game = gameOpt!!;
        require(game.status == 1, "Game not active");
        require(game.player2 != null, "Game not started");
        
        let totalPot = game.betAmount * 2;
        let daoFee = totalPot * self.daoFeePercent / 100;
        let prize = totalPot - daoFee;
        
        if (msg.isDraw) {
            // Refund both players (minus small fee)
            let refund = (totalPot - daoFee) / 2;
            send(SendParameters{
                to: game.player1,
                value: refund,
                mode: SendIgnoreErrors
            });
            send(SendParameters{
                to: game.player2!!,
                value: refund,
                mode: SendIgnoreErrors
            });
        } else {
            // Pay winner
            send(SendParameters{
                to: msg.winner,
                value: prize,
                mode: SendIgnoreErrors
            });
        }
        
        // Send DAO fee
        send(SendParameters{
            to: self.daoTreasury,
            value: daoFee,
            mode: SendIgnoreErrors
        });
        
        // Update game status
        game.status = 2;  // completed
        self.games.set(msg.gameId, game);
    }
    
    // Cancel a waiting game
    receive("cancel") {
        // Implementation for game cancellation
    }
    
    // View functions
    get fun getGame(gameId: Int): Game? {
        return self.games.get(gameId);
    }
    
    get fun getStats(): map<String, Int> {
        let stats: map<String, Int> = emptyMap();
        return stats;
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
