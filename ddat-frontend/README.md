# DDAT Frontend

React + Vite frontend for DDAT.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. For local backend keep:

```env
VITE_API_BASE=/api
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

4. Start dev server:

```bash
npm run dev
```

The Vite proxy in `vite.config.js` forwards `/api` to `http://localhost:5000`.

## Hosted Deployment (Expo Demo)

Set these environment variables in your frontend host (Vercel/Netlify):

```env
VITE_API_BASE=https://your-backend-domain/api
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Notes

- `VITE_API_BASE` must point to your deployed backend URL in hosted environments.
- `VITE_CONTRACT_ADDRESS` must match the contract address configured in backend env.
- Wallet network must match the deployed contract network (currently Sepolia).
