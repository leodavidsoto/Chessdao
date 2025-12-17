# ChessDAO TON Smart Contract

This folder contains the TON blockchain smart contracts for ChessDAO Telegram Mini App.

## Structure

```
ton/
├── contracts/          # FunC smart contract source files
│   ├── chess_token.fc  # CHESS token Jetton contract
│   └── game_escrow.fc  # Game bet escrow contract
├── scripts/            # Deployment and interaction scripts
│   ├── deploy.ts       # Contract deployment script
│   └── interact.ts     # Contract interaction examples
├── wrappers/           # TypeScript contract wrappers
│   └── ChessToken.ts   # Type-safe contract wrapper
├── tests/              # Contract test files
│   └── chess_token.spec.ts
└── README.md           # This file
```

## TON Smart Contract Architecture

### 1. What is FunC?

**FunC** is the high-level programming language for writing smart contracts on TON:

```func
;; Example: Simple counter contract
(int) load_data() inline {
    var ds = get_data().begin_parse();
    return ds~load_uint(32);
}

() save_data(int counter) impure inline {
    set_data(begin_cell().store_uint(counter, 32).end_cell());
}

() recv_internal(int msg_value, cell in_msg, slice in_msg_body) impure {
    int op = in_msg_body~load_uint(32);
    if (op == 1) { ;; increment
        int counter = load_data();
        save_data(counter + 1);
    }
}
```

### 2. Key Concepts

#### Storage (Cells)
- All data stored in immutable **cells** (max 1023 bits + 4 refs)
- Read via **slice** (read-only view)
- Write via **builder** (write-only constructor)

#### Messages
- Contracts communicate ONLY via messages
- `recv_internal` - messages from other contracts/wallets
- `recv_external` - messages from outside (rarely used)

#### Actor Model
Unlike Ethereum, TON contracts:
- Cannot call each other directly
- Must send messages and wait for responses
- Process one message at a time

### 3. CHESS Token Contract

The CHESS token is a **Jetton** (TON's fungible token standard):

**Features:**
- Mintable by admin
- Transferable between users
- Burnable
- Supports metadata

### 4. Game Escrow Contract

For betting games:

**Flow:**
1. Player A creates game → sends tokens to escrow
2. Player B joins → sends matching tokens
3. Game ends → winner receives tokens
4. Dispute? → Admin arbitration

## Development Setup

### Prerequisites

```bash
# Install Node.js 18+
# Install Blueprint toolkit
npm create ton@latest
```

### Build & Test

```bash
# Compile contracts
npx blueprint build

# Run tests
npx blueprint test

# Deploy to testnet
npx blueprint run
```

## Environment Variables

Create `.env`:

```env
WALLET_MNEMONIC="your 24 word mnemonic"
NETWORK=testnet
TONCENTER_API_KEY=your_api_key
```

## Resources

- [TON Documentation](https://docs.ton.org/)
- [FunC Cookbook](https://docs.ton.org/develop/func/cookbook)
- [Blueprint Toolkit](https://github.com/ton-org/blueprint)
- [Jetton Standard](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md)
