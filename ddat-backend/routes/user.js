const express = require("express");
const Commitment = require("../models/Commitment");
const Proof = require("../models/Proof");
const User = require("../models/User");

const router = express.Router();

/**
 * GET /api/user/:wallet/activity
 * Fetch transaction history for a user
 */
router.get("/:wallet/activity", async (req, res) => {
  try {
    const { wallet } = req.params;

    // Validate wallet address
    if (!wallet || typeof wallet !== "string" || wallet.length < 5) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }

    const normalizedWallet = wallet.toLowerCase();

    // Find all commitments by this wallet
    const commitments = await Commitment.find({ walletAddress: normalizedWallet }).sort({ createdAt: -1 });
    const commitmentIds = commitments.map(c => c._id);

    // Build activity array
    const activity = [];

    // Add commitment events
    commitments.forEach(commitment => {
      activity.push({
        type: "commitment_created",
        timestamp: commitment.createdAt,
        details: `"${commitment.goalText}" • ${commitment.durationDays} days • ${commitment.stakeAmount} ETH`,
      });

      // Add settlement event if applicable
      if (commitment.status === "settled_success") {
        activity.push({
          type: "commitment_settled_success",
          timestamp: commitment.updatedAt,
          details: `Goal completed and settled successfully`,
        });
      } else if (commitment.status === "settled_failed") {
        activity.push({
          type: "commitment_settled_failed",
          timestamp: commitment.updatedAt,
          details: `Goal failed and commitment forfeited`,
        });
      }
    });

    // Find all proofs for these commitments
    const proofs = await Proof.find({ commitmentId: { $in: commitmentIds } })
      .populate("commitmentId", "goalText")
      .sort({ createdAt: -1 });

    // Note: We only show commitment-related activity (ETH staking/return/forfeit)
    // Proof activities are not included in regular transaction history

    // Sort by timestamp descending
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, data: activity });
  } catch (err) {
    console.error("Error fetching activity:", err);
    res.status(500).json({ success: false, message: "Failed to fetch activity" });
  }
});

/**
 * DELETE /api/user/:wallet
 * Delete user account and all associated data
 */
router.delete("/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;

    // Validate wallet address
    if (!wallet || typeof wallet !== "string" || wallet.length < 5) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }

    const normalizedWallet = wallet.toLowerCase();

    // Find and delete all commitments by this user
    const commitments = await Commitment.find({ walletAddress: normalizedWallet });
    const commitmentIds = commitments.map(c => c._id);

    // Delete all proofs for these commitments
    await Proof.deleteMany({ commitmentId: { $in: commitmentIds } });

    // Delete all commitments
    await Commitment.deleteMany({ walletAddress: normalizedWallet });

    // Delete user record if exists
    await User.deleteOne({ walletAddress: normalizedWallet });

    res.json({ success: true, message: "Account and all data deleted successfully" });
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
});

module.exports = router;
