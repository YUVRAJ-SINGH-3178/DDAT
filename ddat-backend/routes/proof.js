const express = require("express");
const router = express.Router();
const Proof = require("../models/Proof");
const Commitment = require("../models/Commitment");

// ─── POST /api/proof/:commitmentId — Submit proof for a commitment ──────────
router.post("/:commitmentId", async (req, res) => {
  try {
    const { commitmentId } = req.params;
    const { walletAddress, description, imageUrl } = req.body;

    // Validate required fields
    if (!walletAddress || !description) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: walletAddress, description",
      });
    }

    // Check commitment exists
    const commitment = await Commitment.findById(commitmentId);
    if (!commitment) {
      return res.status(404).json({
        success: false,
        error: "Commitment not found",
      });
    }

    // Verify the caller owns this commitment
    if (commitment.walletAddress !== walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "Only the commitment owner can submit proof",
      });
    }

    // Check commitment is in a valid state for proof submission
    if (commitment.status === "completed" || commitment.status === "failed") {
      return res.status(400).json({
        success: false,
        error: `Commitment is already ${commitment.status}`,
      });
    }

    // Check if proof already exists for this commitment
    const existingProof = await Proof.findOne({ commitmentId });
    if (existingProof) {
      return res.status(400).json({
        success: false,
        error: "Proof has already been submitted for this commitment",
      });
    }

    // Create proof
    const proof = await Proof.create({
      commitmentId,
      walletAddress: walletAddress.toLowerCase(),
      description,
      imageUrl: imageUrl || "",
    });

    // Update commitment status to active (proof submitted, awaiting votes)
    commitment.status = "active";
    await commitment.save();

    res.status(201).json({
      success: true,
      data: proof,
    });
  } catch (error) {
    console.error("Error submitting proof:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── GET /api/proofs/feed — Get all proofs needing votes ────────────────────
router.get("/feed", async (req, res) => {
  try {
    // Find proofs whose parent commitment is still "active" (not yet resolved)
    const activeCommitmentIds = await Commitment.find({
      status: "active",
    }).distinct("_id");

    const proofs = await Proof.find({
      commitmentId: { $in: activeCommitmentIds },
    })
      .populate("commitmentId", "goalText durationDays stakeAmount status")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: proofs.length,
      data: proofs,
    });
  } catch (error) {
    console.error("Error fetching proof feed:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
