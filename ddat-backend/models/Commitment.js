const mongoose = require("mongoose");

const commitmentSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: [true, "Wallet address is required"],
    lowercase: true,
    trim: true,
    index: true,
  },
  goalText: {
    type: String,
    required: [true, "Goal text is required"],
    trim: true,
    maxlength: [500, "Goal text cannot exceed 500 characters"],
  },
  durationDays: {
    type: Number,
    required: [true, "Duration in days is required"],
    min: [1, "Duration must be at least 1 day"],
  },
  stakeAmount: {
    type: String, // stored as string to preserve BigNumber precision
    required: [true, "Stake amount is required"],
  },
  contractCommitmentId: {
    type: Number,
    default: null, // set after on-chain tx confirms
  },
  status: {
    type: String,
    enum: {
      values: ["pending", "active", "completed", "failed"],
      message: "{VALUE} is not a valid status",
    },
    default: "pending",
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Commitment", commitmentSchema);
