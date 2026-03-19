const mongoose = require("mongoose");

const proofSchema = new mongoose.Schema({
  commitmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Commitment",
    required: [true, "Commitment ID is required"],
    index: true,
  },
  walletAddress: {
    type: String,
    required: [true, "Wallet address is required"],
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
  },
  imageUrl: {
    type: String,
    default: "",
    trim: true,
  },
  voteYes: {
    type: Number,
    default: 0,
    min: 0,
  },
  voteNo: {
    type: Number,
    default: 0,
    min: 0,
  },
  votedBy: {
    type: [String], // array of wallet addresses that have voted
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Proof", proofSchema);
