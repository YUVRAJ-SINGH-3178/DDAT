require("dotenv").config();
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const Commitment = require("../models/Commitment");

const ABI = [
  {
    inputs: [],
    name: "commitmentCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_commitmentId", type: "uint256" }],
    name: "getCommitment",
    outputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "string", name: "goal", type: "string" },
      { internalType: "uint256", name: "stakeAmount", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "completed", type: "bool" },
      { internalType: "bool", name: "released", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const {
    MONGODB_URI,
    MONGODB_IP_FAMILY,
    SEPOLIA_RPC_URL,
    CONTRACT_ADDRESS,
  } = process.env;

  if (!MONGODB_URI || !SEPOLIA_RPC_URL || !CONTRACT_ADDRESS) {
    throw new Error("Missing one of: MONGODB_URI, SEPOLIA_RPC_URL, CONTRACT_ADDRESS");
  }

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    family: Number(MONGODB_IP_FAMILY || 4),
  });

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  const withRetry = async (fn, label, attempts = 8, delayMs = 1200) => {
    let lastError;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (i < attempts) {
          console.warn(`Retry ${i}/${attempts} for ${label}: ${err.message}`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw new Error(`${label} failed after ${attempts} attempts: ${lastError?.message || "unknown"}`);
  };

  const total = Number(
    await withRetry(() => contract.commitmentCount(), "commitmentCount")
  );
  console.log(`Found ${total} on-chain commitments`);

  let upserts = 0;
  for (let i = 0; i < total; i++) {
    const c = await withRetry(() => contract.getCommitment(i), `getCommitment(${i})`);
    const user = c.user.toLowerCase();
    const goalText = (c.goal || "").trim() || `Commitment #${i}`;
    const stakeAmount = ethers.formatEther(c.stakeAmount);
    const completed = Boolean(c.completed);
    const released = Boolean(c.released);

    const nowTs = Math.floor(Date.now() / 1000);
    const deadline = Number(c.deadline);
    const estDays = Math.max(1, Math.ceil(Math.max(0, deadline - nowTs) / 86400));

    let status = "created";
    if (released) {
      status = "settled_success";
    } else if (completed) {
      status = "proving";
    }

    await Commitment.findOneAndUpdate(
      { contractCommitmentId: i },
      {
        walletAddress: user,
        goalText,
        durationDays: estDays,
        acceptedProofCount: 0,
        stakeAmount,
        contractCommitmentId: i,
        status,
        createdAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserts++;
  }

  console.log(`Backfill complete. Upserted ${upserts} commitments.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Backfill failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
