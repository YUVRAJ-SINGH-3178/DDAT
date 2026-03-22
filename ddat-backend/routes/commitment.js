const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const Commitment = require("../models/Commitment");
const User = require("../models/User");

// ─── POST /api/commitment — Create a new commitment ────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      walletAddress,
      goalText,
      durationDays,
      stakeAmount,
      contractCommitmentId,
    } = req.body;

    // Validate required fields
    if (!walletAddress || !goalText || !durationDays || !stakeAmount) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: walletAddress, goalText, durationDays, stakeAmount",
      });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    if (!Number.isFinite(Number(durationDays)) || Number(durationDays) < 1) {
      return res.status(400).json({
        success: false,
        error: "durationDays must be a number >= 1",
      });
    }

    if (!Number.isFinite(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "stakeAmount must be a positive number",
      });
    }

    // Upsert user (create if doesn't exist)
    await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { walletAddress: walletAddress.toLowerCase() },
      { upsert: true, new: true }
    );

    // Create commitment
    const commitment = await Commitment.create({
      walletAddress: walletAddress.toLowerCase(),
      goalText,
      durationDays,
      stakeAmount,
      contractCommitmentId: contractCommitmentId ?? null,
      status: "created",
    });

    res.status(201).json({
      success: true,
      data: commitment,
    });
  } catch (error) {
    console.error("Error creating commitment:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── GET /api/commitments/:walletAddress — Get user's commitments ───────────
router.get("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    const commitments = await Commitment.find({
      walletAddress: walletAddress.toLowerCase(),
    }).sort({ createdAt: -1 });

    // Build a stable per-user display index (starts at 0).
    // Index is based on oldest -> newest creation order.
    const oldestFirst = [...commitments].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const localIndexById = new Map(
      oldestFirst.map((commitment, idx) => [String(commitment._id), idx])
    );

    const commitmentsWithLocalId = commitments.map((commitment) => ({
      ...commitment.toObject(),
      localCommitmentId: localIndexById.get(String(commitment._id)),
    }));

    res.json({
      success: true,
      count: commitmentsWithLocalId.length,
      data: commitmentsWithLocalId,
    });
  } catch (error) {
    console.error("Error fetching commitments:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
