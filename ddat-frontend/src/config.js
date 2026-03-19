// DDATracker contract config — update CONTRACT_ADDRESS after deploying
export const CONTRACT_ADDRESS = "0xFeDfe7b020058B28bB9b057B0525A08B8B483Fcd";

export const DDA_TRACKER_ABI = [
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
    name: "commitmentCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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
    stateMutability: "payable",
    type: "receive",
  },
];

export const API_BASE = "/api";
