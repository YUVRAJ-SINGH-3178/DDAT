# DDAT - Decentralized Daily Accountability Tracker

A full-stack Web3 accountability platform where users stake real ETH against personal goals. Complete your commitment and get it back. Fail, and it's gone forever — enforced by smart contract and community consensus.

## Interface Style

DDAT features a strict **Neo-Brutalist** visual identity:
- **Typography:** High-impact `Cabinet Grotesk` headings paired with clean `Satoshi` body text.
- **Palette:** High-contrast Charcoal (`#171e19`), vibrant Yellow (`#ffe17c`), and muted Sage (`#b7c6c2`).
- **Mechanics:** 2px thick black borders on all interactive elements, paired with 0px blur hard shadows. Buttons feature a mechanical "push" translation on hover.

## Recent Improvements

- **Reliable vote feed behavior:** Vote buttons lock while a request is in-flight and resolved proofs are removed as soon as threshold settlement completes.
- **Correct dashboard recency:** Recent positions now consistently show newest items first.
- **Per-account task numbering:** Dashboard cards show account-local IDs (`TASK:#0`, `TASK:#1`, ...) while still exposing on-chain CIDs for traceability.
- **Smoother tab refocus UX:** Dashboard refreshes silently in the background on focus/interval to avoid visible loading flicker.
- **Backend connection hardening:** MongoDB startup now retries with controlled delays and logs disconnect/reconnect lifecycle events.
- **Wallet case normalization:** User activity and account cleanup routes normalize wallet addresses to avoid false "missing data" scenarios.
- **Header profile shortcut:** Top-right header includes a direct GitHub profile link.

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
- Sepolia testnet ETH from a faucet ([Alchemy faucet](https://www.alchemy.com/faucets/ethereum-sepolia))

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
CORS_ORIGINS=http://localhost:5173
MONGODB_CONNECT_RETRIES=10
MONGODB_CONNECT_RETRY_DELAY_MS=3000
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
cp .env.example .env
```

Fill in `.env`:
```env
VITE_API_BASE=/api
VITE_CONTRACT_ADDRESS=your_deployed_contract_address
```

Start:
```bash
npm run dev
```

Open `http://localhost:5173` and connect MetaMask.

## Demo Hosting (Expo-Ready)

Use this setup for a quick public demo:

1. Backend (Render/Railway)
       - Root: `ddat-backend`
       - Start command: `npm start`
       - Set backend `.env` values from above, including `CORS_ORIGINS`

2. Frontend (Vercel/Netlify)
       - Root: `ddat-frontend`
       - Build command: `npm run build`
       - Output directory: `dist`
       - Set:
         - `VITE_API_BASE=https://your-backend-domain/api`
         - `VITE_CONTRACT_ADDRESS=your_deployed_contract_address`

3. Ensure your deployed backend `CORS_ORIGINS` includes the deployed frontend domain.

## API Endpoints

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `GET` | `/api/commitments/:wallet` | Get user's commitments | 100/15min |
| `POST` | `/api/commitment` | Create new commitment | 20/15min |
| `POST` | `/api/proof/:commitmentId` | Submit proof for a commitment | 20/15min |
| `GET` | `/api/proofs/feed` | Get pending proofs for voting | 100/15min |
| `POST` | `/api/vote/:proofId` | Vote on a proof | 30/15min |
| `GET` | `/api/health` | Server health check | 100/15min |

## ID and Settlement Notes

- On-chain `CID` is a global counter for the deployed contract and is not wallet-specific.
- Dashboard `TASK:#` is wallet-specific and starts at `0` for each account.
- Stake settlement is not time-based alone: stake is returned only after final successful consensus settlement and is forfeited on failed settlement.

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


