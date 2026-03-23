const express = require("express");
const { ethers } = require("ethers");
const {
  getForfeitedPoolBalance,
  withdrawForfeitedPoolFunds,
} = require("../services/contractService");

const router = express.Router();

function isAuthorized(req) {
  const configuredAdminKey = process.env.ADMIN_API_KEY;
  if (!configuredAdminKey) {
    return false;
  }

  const headerKey = req.header("x-admin-key");
  return typeof headerKey === "string" && headerKey === configuredAdminKey;
}

function requireAdminAuth(req, res, next) {
  if (!isAuthorized(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized admin request",
    });
  }

  next();
}

// GET /api/admin/forfeited-pool
router.get("/forfeited-pool", requireAdminAuth, async (req, res) => {
  try {
    const balance = await getForfeitedPoolBalance();
    return res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error("Error reading forfeited pool balance:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/admin/forfeited-pool/withdraw
router.post("/forfeited-pool/withdraw", requireAdminAuth, async (req, res) => {
  try {
    const { toAddress, amountWei, amountEth, purpose } = req.body;

    if (!toAddress || !ethers.isAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing toAddress",
      });
    }

    let normalizedAmountWei;
    if (amountWei != null && amountWei !== "") {
      normalizedAmountWei = String(amountWei);
    } else if (amountEth != null && amountEth !== "") {
      try {
        normalizedAmountWei = ethers.parseEther(String(amountEth)).toString();
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid amountEth",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "Provide amountWei or amountEth",
      });
    }

    if (!/^\d+$/.test(normalizedAmountWei) || normalizedAmountWei === "0") {
      return res.status(400).json({
        success: false,
        error: "Amount must be a positive integer (wei)",
      });
    }

    const normalizedPurpose =
      typeof purpose === "string" && purpose.trim().length > 0
        ? purpose.trim()
        : "general";

    const tx = await withdrawForfeitedPoolFunds(
      toAddress,
      normalizedAmountWei,
      normalizedPurpose
    );

    return res.json({
      success: true,
      data: tx,
    });
  } catch (error) {
    console.error("Error withdrawing forfeited pool funds:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
