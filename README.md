# DDAT - Enterprise Task Grid + Legacy Web3 Accountability

DDAT is now a hybrid system with two active modes:

- Enterprise task operations: create tasks by lab, assign work, submit evidence, vote outcomes, and manage role requests.
- Legacy Web3 accountability: stake commitments, submit proofs, and settle on-chain outcomes through DDATracker.

The frontend currently prioritizes the enterprise workflow, while backend APIs still support both enterprise and legacy flows.

## What Changed

The app has moved from a pure personal-staking product to an enterprise daily work validation model.

- New role model: member, affiliate, executive
- New lab model: fixed lab catalog used across profile/task flows
- New task lifecycle: open -> in_review -> done or rejected
- New reviewer rules:
  - enterprise tasks: executive only voting
  - employee tasks: affiliate and executive voting
- New weighted vote logic: creator vote weight is configurable
- New executive approval flow for role change requests
- New admin forfeited-pool APIs for smart contract funds management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.20, Hardhat, Sepolia |
| Backend | Node.js, Express 5, MongoDB, Mongoose, Ethers v6 |
| Frontend | React 19, Vite 7, Tailwind v4 |
| Monitoring | Sentry (optional via env) |
| Wallet | MetaMask |

## Current Product Flows

### Enterprise Flow (Primary UI)

1. User connects wallet
2. User completes profile (name, email domain, org, lab, role)
3. User creates task:
   - member: only employee-source, self-assigned
   - affiliate/executive: can create enterprise tasks and assign others
4. Assignee submits work note and optional evidence URL
5. Eligible reviewers vote yes/no
6. Task auto-finalizes once required votes are reached
7. Dashboard shows live task status and metrics

### Legacy Staking Flow (Backend + Contract)

1. Create commitment
2. Submit proof
3. Vote on proof
4. If settled, backend relays settlement to contract
5. Forfeited stakes are tracked in contract pool and can be withdrawn by owner/admin API

## Project Structure

```text
DDAT/
  ddat-contract/
    contracts/DDATracker.sol
    scripts/deploy.js
    test/DDATracker.test.js
  ddat-backend/
    server.js
    config/labs.js
    models/Task.js
    models/User.js
    routes/task.js
    routes/user.js
    routes/admin.js
    routes/commitment.js
    routes/proof.js
    routes/vote.js
  ddat-frontend/
    src/pages/Dashboard.jsx
    src/pages/CreateCommitment.jsx
    src/pages/SubmitProof.jsx
    src/pages/ProofFeed.jsx
    src/pages/Settings.jsx
    src/pages/AdminRoleRequests.jsx
```

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- MetaMask
- Sepolia RPC access and testnet ETH if testing on-chain paths

### 1) Contract

```bash
cd ddat-contract
npm install
cp .env.example .env
```

Fill .env:

```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=your_deployer_private_key
```

Deploy:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 2) Backend

```bash
cd ddat-backend
npm install
cp .env.example .env
```

Minimum backend .env:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ddat
CORS_ORIGINS=http://localhost:5173
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_backend_relayer_private_key
CONTRACT_ADDRESS=your_deployed_contract_address
ADMIN_API_KEY=set_a_strong_random_secret
```

Optional backend tuning .env:

```env
MONGODB_CONNECT_RETRIES=10
MONGODB_CONNECT_RETRY_DELAY_MS=3000
MONGODB_IP_FAMILY=4
ENFORCE_HTTPS=false
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
VOTE_THRESHOLD=5
TASK_VOTE_THRESHOLD=3
ENTERPRISE_TASK_VOTE_THRESHOLD=1
TASK_APPROVAL_PERCENT=60
CREATOR_VOTE_WEIGHT_PERCENT=150
```

Run:

```bash
npm run dev
```

### 3) Frontend

```bash
cd ddat-frontend
npm install
cp .env.example .env
```

Fill .env:

```env
VITE_API_BASE=/api
VITE_CONTRACT_ADDRESS=your_deployed_contract_address
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

Run:

```bash
npm run dev
```

## API Overview

### Enterprise APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/tasks/labs/list | List lab catalog |
| GET | /api/tasks | List tasks (filter by wallet/org/lab/status) |
| POST | /api/tasks | Create task |
| POST | /api/tasks/:taskId/submit | Submit work evidence |
| POST | /api/tasks/:taskId/vote | Cast review vote |
| POST | /api/tasks/finalize-in-review | Finalize eligible in_review tasks |
| GET | /api/user/:wallet/profile | Get or bootstrap profile |
| POST | /api/user/:wallet/profile | Update profile or request role change |
| GET | /api/user/members/by-lab/:labKey | Discover assignable members |
| GET | /api/user/role-requests/pending | Executive view of pending requests |
| POST | /api/user/:wallet/approve-role | Executive approve or deny role request |

### Admin Pool APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/admin/forfeited-pool | Contract forfeited pool balance |
| POST | /api/admin/forfeited-pool/withdraw | Withdraw forfeited funds with purpose tag |

### Legacy APIs (Still Available)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/commitment | Create legacy commitment |
| GET | /api/commitments/:walletAddress | List legacy commitments |
| POST | /api/proof/:commitmentId | Submit legacy proof |
| GET | /api/proofs/feed | Get legacy pending proofs |
| POST | /api/vote/:proofId | Vote legacy proof |

## Smart Contract

DDATracker supports:

- createCommitment
- submitProof
- verifyAndRelease
- getForfeitedPoolBalance
- withdrawForfeitedStakes
- withdrawForfeitedPoolFunds

Forfeited stakes now accumulate in a dedicated tracked pool.

## Security and Monitoring

- Helmet and CORS policy support
- Global and route-level rate limits
- HTTPS enforcement toggle:
  - development: ENFORCE_HTTPS=false
  - production: ENFORCE_HTTPS=true
- Admin API key gate for pool operations
- Optional Sentry integration:
  - backend via SENTRY_DSN
  - frontend via VITE_SENTRY_DSN

If Sentry DSNs are empty, the app still runs and monitoring remains off.

## Testing

Run all test/build checks:

```bash
cd ddat-contract && npm test
cd ../ddat-backend && npm test
cd ../ddat-frontend && npm run build
```

## Hosting Readiness

Current status:

- Local development: ready
- Demo hosting and project expo: ready
- Production (real SLA, hardened operations): not fully ready

Production gaps to close:

1. Full backend integration test coverage for enterprise and admin routes
2. CI security gates and dependency scanning
3. Secret management and key rotation policy
4. Incident response and rollback playbook
5. External smart contract audit before mainnet use

## Disclaimer

This project is currently best suited for testnet demos, internal pilots, and learning environments.
Do not treat it as mainnet-grade production infrastructure without additional hardening and audit.
