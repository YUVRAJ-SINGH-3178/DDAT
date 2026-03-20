# DDAT — Decentralized Daily Accountability Tracker

A full-stack Web3 accountability platform where users stake real ETH against personal goals. Complete your commitment and get it back. Fail, and it's gone forever — enforced by smart contract and community consensus.

## 🌟 The Neo-Brutalist Interface

DDAT features a strict **Neo-Brutalist** visual identity:
- **Typography:** High-impact `Cabinet Grotesk` headings paired with clean `Satoshi` body text.
- **Palette:** High-contrast Charcoal (`#171e19`), vibrant Yellow (`#ffe17c`), and muted Sage (`#b7c6c2`).
- **Mechanics:** 2px thick black borders on all interactive elements, paired with 0px blur hard shadows. Buttons feature a mechanical "push" translation on hover.

## How It Works

1. **Stake** — Lock ETH into a smart contract with a goal and deadline
2. **Prove** — Submit daily evidence (text log + image) recorded on-chain
3. **Vote** — The community reviews proofs and votes Accept or Reject
4. **Settle** — Once the vote threshold is reached, the contract either refunds the stake or forfeits it based on the consensus result

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity ^0.8.20, Hardhat, Ethereum Sepolia Testnet |
| Backend | Node.js, Express, MongoDB, Mongoose, Ethers.js v6 |
| Frontend | React 19, Vite, Tailwind CSS v4, Ethers.js v6 |
| Wallet | MetaMask |

## Project Structure

```
DDAT/
├── ddat-contract/       # Solidity smart contract + Hardhat config
│   ├── contracts/       # DDATracker.sol
│   ├── scripts/         # deploy.js
│   └── hardhat.config.js
├── ddat-backend/        # Express API + blockchain relayer
│   ├── models/          # Mongoose schemas (Commitment, Proof, User)
│   ├── routes/          # API endpoints (commitment, proof, vote)
│   ├── services/        # contractService.js (on-chain interactions)
│   └── server.js
├── ddat-frontend/       # React SPA
│   ├── src/components/  # AppLayout (navbar, routing)
│   ├── src/pages/       # Dashboard, CreateCommitment, SubmitProof, ProofFeed
│   └── src/config.js    # Contract ABI + addresses
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- MetaMask browser extension
- Sepolia testnet ETH ([faucet](https://www.alchemy.com/faucets/ethereum-sepolia))

### 1. Deploy the Smart Contract

```bash
cd ddat-contract
npm install
cp .env.example .env
```

Fill in `.env`:
```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=your_deployer_private_key
```

Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Save the deployed contract address for the next steps.

### 2. Start the Backend

```bash
cd ddat-backend
npm install
cp .env.example .env
```

Fill in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ddat
VOTE_THRESHOLD=3
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=your_backend_relayer_private_key
CONTRACT_ADDRESS=deployed_contract_address
```

Start:
```bash
npm run dev
```

### 3. Start the Frontend

```bash
cd ddat-frontend
npm install
```

Update `src/config.js` with your contract address:
```javascript
export const CONTRACT_ADDRESS = "your_deployed_contract_address";
export const API_BASE = "/api";
```

Start:
```bash
npm run dev
```

Open `http://localhost:5173` and connect MetaMask.

## API Endpoints

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `GET` | `/api/commitments/:wallet` | Get user's commitments | 100/15min |
| `POST` | `/api/commitment` | Create new commitment | 20/15min |
| `POST` | `/api/proof/:commitmentId` | Submit proof for a commitment | 20/15min |
| `GET` | `/api/proofs/feed` | Get pending proofs for voting | 100/15min |
| `POST` | `/api/vote/:proofId` | Vote on a proof | 30/15min |
| `GET` | `/api/health` | Server health check | 100/15min |

## Smart Contract

The `DDATracker` contract handles:
- **createCommitment(goal, duration)** — Lock ETH with a goal and deadline
- **submitProof(commitmentId)** — Register proof completion on-chain
- **verifyAndRelease(commitmentId, success)** — Called by the backend relayer after consensus; refunds or retains the stake

## Application Flow

```
User creates commitment        User submits proof
    ↓ (MetaMask tx)                ↓ (MetaMask tx + API upload)
    ↓                              ↓
Smart Contract locks ETH       Proof appears in Consensus Feed
                                   ↓
                            Community votes Accept/Reject
                                   ↓
                            Threshold reached → Backend relayer calls
                            verifyAndRelease() on smart contract
                                   ↓
                            ETH refunded (>60% accept) or forfeited
```

## Security

- **Rate limiting** on all endpoints (express-rate-limit)
- **Backend relayer** handles gas for settlement transactions
- Wallet addresses are normalized to lowercase for consistent lookups
- Voting prevents self-voting (can't vote on your own proof)

## Disclaimer

This is a testnet project built for learning and experimentation with Web3 accountability mechanisms. Do not deploy to mainnet without a comprehensive smart contract audit.

## License

MIT
