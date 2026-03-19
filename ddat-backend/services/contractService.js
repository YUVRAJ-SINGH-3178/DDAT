const { ethers } = require("ethers");

// ─── DDATracker ABI (from Hardhat compilation artifacts) ────────────────────
const DDA_TRACKER_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "commitmentId", type: "uint256" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "string", name: "goal", type: "string" },
      { indexed: false, internalType: "uint256", name: "stakeAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "CommitmentCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "commitmentId", type: "uint256" },
      { indexed: false, internalType: "bool", name: "success", type: "bool" },
      { indexed: false, internalType: "uint256", name: "stakeAmount", type: "uint256" },
    ],
    name: "CommitmentVerified",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "commitmentId", type: "uint256" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
    ],
    name: "ProofSubmitted",
    type: "event",
  },
  {
    inputs: [],
    name: "commitmentCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "commitments",
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
  {
    inputs: [
      { internalType: "string", name: "_goal", type: "string" },
      { internalType: "uint256", name: "_durationInSeconds", type: "uint256" },
    ],
    name: "createCommitment",
    outputs: [],
    stateMutability: "payable",
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
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_commitmentId", type: "uint256" }],
    name: "submitProof",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_commitmentId", type: "uint256" },
      { internalType: "bool", name: "_success", type: "bool" },
    ],
    name: "verifyAndRelease",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address payable", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "withdrawForfeitedStakes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
];

// ─── Provider, Wallet & Contract Setup ──────────────────────────────────────
let provider;
let wallet;
let contract;

/**
 * Initialise the ethers provider, wallet, and contract instance.
 * Called lazily on first use so env vars are guaranteed to be loaded.
 */
function getContract() {
  if (contract) return contract;

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error(
      "contractService: SEPOLIA_RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS must be set in .env"
    );
  }

  provider = new ethers.JsonRpcProvider(rpcUrl);
  wallet = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(contractAddress, DDA_TRACKER_ABI, wallet);

  console.log("🔗 Contract service initialised");
  console.log("   Contract :", contractAddress);
  console.log("   Signer   :", wallet.address);

  return contract;
}

// ─── lockStake ──────────────────────────────────────────────────────────────
/**
 * Call createCommitment on-chain.
 * NOTE: This is called by the backend (server wallet) on behalf of a user.
 *       In a production flow the user would sign this tx themselves via the
 *       frontend. This function is useful for admin / testing flows.
 *
 * @param {string} goal           - Goal description
 * @param {number} durationSecs   - Duration in seconds
 * @param {string} stakeWei       - Stake amount in wei (string)
 * @returns {object}              - { txHash, commitmentId }
 */
async function lockStake(goal, durationSecs, stakeWei) {
  try {
    const ddaContract = getContract();

    console.log(`\n🔒 Locking stake on-chain...`);
    console.log(`   Goal     : ${goal}`);
    console.log(`   Duration : ${durationSecs}s`);
    console.log(`   Stake    : ${ethers.formatEther(stakeWei)} ETH\n`);

    const tx = await ddaContract.createCommitment(goal, durationSecs, {
      value: stakeWei,
    });

    console.log(`   Tx hash  : ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

    // Parse CommitmentCreated event to get the on-chain commitment ID
    const event = receipt.logs
      .map((log) => {
        try {
          return ddaContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "CommitmentCreated");

    const commitmentId = event ? Number(event.args.commitmentId) : null;
    console.log(`   On-chain ID : ${commitmentId}\n`);

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      commitmentId,
    };
  } catch (error) {
    console.error("❌ lockStake failed:", error.message);
    throw error;
  }
}

// ─── settleCommitment ───────────────────────────────────────────────────────
/**
 * Call verifyAndRelease on-chain.
 * If success=true  → stake is returned to the user.
 * If success=false → stake stays in the contract (forfeited).
 *
 * @param {number}  contractCommitmentId - On-chain commitment ID
 * @param {boolean} success              - true = release stake, false = forfeit
 * @returns {object}                     - { txHash, blockNumber }
 */
async function settleCommitment(contractCommitmentId, success) {
  try {
    const ddaContract = getContract();

    console.log(`\n⚖️  Settling commitment #${contractCommitmentId} on-chain...`);
    console.log(`   Success : ${success}`);

    // Step 1: Check if proof was submitted on-chain
    const onChain = await ddaContract.getCommitment(contractCommitmentId);
    if (!onChain.completed) {
      console.log(`   ⚠️  Proof not yet registered on-chain. Submitting now...`);
      const proofTx = await ddaContract.submitProof(contractCommitmentId);
      await proofTx.wait();
      console.log(`   ✅ Proof auto-submitted on-chain.`);
    }

    // Step 2: Release (or forfeit) the stake
    const tx = await ddaContract.verifyAndRelease(contractCommitmentId, success);

    console.log(`   Tx hash : ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}\n`);

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("❌ settleCommitment failed:", error.message);
    throw error;
  }
}

module.exports = { lockStake, settleCommitment };
