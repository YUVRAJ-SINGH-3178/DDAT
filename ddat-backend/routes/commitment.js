const express = require("express");
const router = express.Router();
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
      status: contractCommitmentId != null ? "active" : "pending",
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

    const commitments = await Commitment.find({
      walletAddress: walletAddress.toLowerCase(),
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: commitments.length,
      data: commitments,
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
