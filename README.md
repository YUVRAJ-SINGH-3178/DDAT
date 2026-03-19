# DDAT - Decentralized Daily Accountability Tracker

DDAT is a full-stack Web3 application designed to hold users accountable to their personal goals. Users stake cryptocurrency (MATIC) against a commitment. To get their stake back, they must provide daily cryptographic proof (images + logs) over a specific duration, which is then verified by a decentralized community consensus.

## 🌟 Key Features

- **Capital Staking**: Users lock real value (MATIC) into a secure smart contract on the Polygon Amoy Testnet.
- **Smart Contract Consensus**: The contract autonomously releases or forfeits the stake based entirely on the community's votes (`>60%` approval required).
- **Experimental UI**: The frontend utilizes a unique "Fluid Brutalist + Cinematic Social" aesthetic. No generic dashboards—just massive typography, sleek glassmorphic navigation pills, and edge-to-edge cinematic image feeds.
- **Gasless Voting Validation**: The backend handles the gas fees for the final `settleCommitment` transaction when consensus is reached, minimizing friction for voters.

---

## 🏗️ Architecture & Tech Stack

This repository is structured into three main directories:

1. **`ddat-contract` (Smart Contracts)**
   - **Solidity (^0.8.20)**: powers the `DDATracker` contract.
   - **Hardhat**: Development environment, testing, and deployment scripts.

2. **`ddat-backend` (Node.js API & Relayer)**
   - **Express.js & MongoDB/Mongoose**: Handles off-chain relational data (user profiles, proof images, vote tracking).
   - **Ethers.js (v6)**: Acts as a relayer to interact with the Polygon Amoy blockchain securely.

3. **`ddat-frontend` (React Web Interface)**
   - **React + Vite**: Lightning-fast build and HMR.
   - **Tailwind CSS**: Custom designed glassmorphism, brutalist typography (`Syne` and `Space Grotesk`), and fluid background animations.
   - **Ethers.js (v6)**: Connects users via MetaMask to initiate staking contracts on-chain.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local instance or MongoDB Atlas URL)
- MetaMask extension installed in your browser
- Testnet MATIC (Polygon Amoy)

### 1. Smart Contract Deployment
You need to deploy the `DDATracker` contract first to generate the `CONTRACT_ADDRESS`.

```bash
cd ddat-contract

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```
Fill in the `.env` file:
```env
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_wallet_private_key
POLYGONSCAN_API_KEY=optional_for_contract_verification
```

Deploy the contract:
```bash
npx hardhat run scripts/deploy.js --network amoy
```
*Take note of the deployed Contract Address.*

### 2. Backend Setup

```bash
cd ../ddat-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```
Fill in the `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ddat
VOTE_THRESHOLD=5
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_backend_relayer_private_key
CONTRACT_ADDRESS=address_from_step_1
```

Start the server:
```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd ../ddat-frontend

# Install dependencies
npm install
```

Update the configuration in `src/config.js`:
```javascript
export const CONTRACT_ADDRESS = "address_from_step_1";
export const API_BASE = "http://localhost:5000/api";
```

Start the development server:
```bash
npm run dev
```

---

## 🖥️ Application Flow

1. **Portfolio (Dashboard)**: Users connect MetaMask. The app pulls their off-chain data and presents their total open MATIC positions.
2. **Execute (Create Commitment)**: User enters an intention (e.g., "Hit the gym for 30 days") and locks up MATIC. MetaMask prompts a transaction to the `DDATracker` contract.
3. **Evidence (Submit Proof)**: Daily, the user uploads an image and log covering their progress.
4. **Consensus (Proof Feed)**: The community reviews pending proof blocks in a cinematic scrolling feed featuring massive Glassmorphism layout. They vote `Accept` or `Reject`.
5. **Settlement**: Once `VOTE_THRESHOLD` is reached, the backend calculates the ratio. If `>60%` accepted, the backend calls `verifyAndRelease(id, true)` on-chain, and the user gets their MATIC back. Otherwise, the stake is retained.

---

## ⚠️ Disclaimer
*This is a testnet project built for experimental design and Web3 accountability mechanisms. Do not deploy to mainnet without comprehensive smart contract auditing.*
