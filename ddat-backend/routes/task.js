const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const { LABS } = require("../config/labs");
const {
  SYSTEM_DECISION_WALLET,
  rejectExpiredOpenTasks,
} = require("../services/taskDeadlineService");

const router = express.Router();

const TASK_VOTE_THRESHOLD = parseInt(process.env.TASK_VOTE_THRESHOLD, 10) || 3;
const ENTERPRISE_TASK_VOTE_THRESHOLD = parseInt(process.env.ENTERPRISE_TASK_VOTE_THRESHOLD, 10) || 1;
const REQUIRED_APPROVAL_PERCENT = parseInt(process.env.TASK_APPROVAL_PERCENT, 10) || 60;
const CREATOR_VOTE_WEIGHT_PERCENT = parseInt(process.env.CREATOR_VOTE_WEIGHT_PERCENT, 10) || 150;

function normalizeRole(inputRole) {
  const value = String(inputRole || "").trim().toLowerCase();

  if (value === "enterprise_admin") return "executive";
  if (value === "employee") return "member";
  if (["member", "affiliate", "executive"].includes(value)) return value;

  return "member";
}

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function getTaskDeadline(task) {
  return task.endDate || task.workDate || null;
}

function hasTaskDeadlinePassed(task, now = new Date()) {
  const deadline = getTaskDeadline(task);
  if (!deadline) return false;
  return deadline.getTime() < now.getTime();
}

function getRequiredVotes(totalEligible) {
  // strict majority: 1/2 + 1
  return Math.max(1, Math.floor(totalEligible / 2) + 1);
}

async function computeVotingContext(task) {
  const voterRolesForTask = task.source === "enterprise" ? ["executive"] : ["affiliate", "executive"];
  let eligibleVoterCount = await User.countDocuments({
    organization: task.organization,
    role: { $in: voterRolesForTask },
    walletAddress: { $ne: task.assignedToWallet || "" },
  });

  if (!eligibleVoterCount) {
    eligibleVoterCount = await User.countDocuments({
      role: { $in: voterRolesForTask },
      walletAddress: { $ne: task.assignedToWallet || "" },
    });
  }

  const defaultThreshold = task.source === "enterprise" ? ENTERPRISE_TASK_VOTE_THRESHOLD : TASK_VOTE_THRESHOLD;
  const requiredVotes = Math.max(defaultThreshold, getRequiredVotes(eligibleVoterCount));

  return { eligibleVoterCount, requiredVotes };
}

function getWeightedTotals(task) {
  const weightedYes = Number(task.weightedVoteYes || 0) || Number(task.voteYes || 0);
  const weightedNo = Number(task.weightedVoteNo || 0) || Number(task.voteNo || 0);
  const totalWeightedVotes = weightedYes + weightedNo;
  return { weightedYes, weightedNo, totalWeightedVotes };
}

async function finalizeTaskIfReady(task) {
  if (task.status !== "in_review") return { finalized: false };

  const totalVotes = Number(task.voteYes || 0) + Number(task.voteNo || 0);
  const { eligibleVoterCount, requiredVotes } = await computeVotingContext(task);
  task.eligibleVoterCount = eligibleVoterCount;
  task.requiredVotes = requiredVotes;

  if (totalVotes < requiredVotes) {
    await task.save();
    return { finalized: false, totalVotes, requiredVotes, eligibleVoterCount };
  }

  const { weightedYes, weightedNo, totalWeightedVotes } = getWeightedTotals(task);
  const yesPercent = totalWeightedVotes > 0 ? (weightedYes / totalWeightedVotes) * 100 : 0;
  const approved = yesPercent >= REQUIRED_APPROVAL_PERCENT;

  task.weightedVoteYes = weightedYes;
  task.weightedVoteNo = weightedNo;
  task.status = approved ? "done" : "rejected";
  task.resolvedAt = new Date();
  await task.save();

  return {
    finalized: true,
    approved,
    totalVotes,
    requiredVotes,
    eligibleVoterCount,
    weightedYes,
    weightedNo,
    totalWeightedVotes,
  };
}

router.get("/labs/list", (req, res) => {
  res.json({ success: true, data: LABS });
});

/**
 * GET /api/tasks
 * Query params: wallet, organization, labKey, status
 */
router.get("/", async (req, res) => {
  try {
    const { wallet, organization, labKey, status, autoFinalize = "1" } = req.query;
    const query = {};

    if (organization) {
      query.organization = String(organization).trim();
    }

    if (labKey) {
      query.labKey = String(labKey).trim();
    }

    if (status) {
      query.status = String(status).trim();
    }

    if (wallet && typeof wallet === "string") {
      const normalizedWallet = wallet.toLowerCase();
      query.$or = [
        { createdByWallet: normalizedWallet },
        { assignedToWallet: normalizedWallet },
      ];
    }

    await rejectExpiredOpenTasks();
    let tasks = await Task.find(query).sort({ createdAt: -1 });

    if (String(autoFinalize) !== "0") {
      const inReviewTasks = tasks.filter((task) => task.status === "in_review");
      if (inReviewTasks.length > 0) {
        for (const task of inReviewTasks) {
          await finalizeTaskIfReady(task);
        }
        tasks = await Task.find(query).sort({ createdAt: -1 });
      }
    }

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ success: false, error: "Failed to fetch tasks" });
  }
});

/**
 * POST /api/tasks
 * Create a task by enterprise admin or employee
 */
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description = "",
      organization,
      labKey,
      source = "employee",
      createdByWallet,
      assignedToWallet = "",
      workDate,
      endDate,
    } = req.body || {};

    if (!title || !organization || !labKey || !createdByWallet || !workDate) {
      return res.status(400).json({
        success: false,
        error: "Missing fields: title, organization, labKey, createdByWallet, workDate",
      });
    }

    const normalizedSource = String(source).toLowerCase();
    if (!["enterprise", "employee"].includes(normalizedSource)) {
      return res.status(400).json({ success: false, error: "source must be enterprise or employee" });
    }

    if (!isValidDate(workDate)) {
      return res.status(400).json({ success: false, error: "Invalid workDate" });
    }

    let parsedEndDate = null;
    if (endDate) {
      if (!isValidDate(endDate)) {
        return res.status(400).json({ success: false, error: "Invalid endDate" });
      }
      parsedEndDate = new Date(endDate);
    }

    const parsedWorkDate = new Date(workDate);
    if (parsedEndDate && parsedEndDate < parsedWorkDate) {
      return res.status(400).json({ success: false, error: "endDate cannot be earlier than workDate" });
    }

    const durationDays = parsedEndDate
      ? Math.floor((parsedEndDate.getTime() - parsedWorkDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
      : 1;

    const normalizedLabKey = String(labKey).trim();
    if (!LABS.some((lab) => lab.key === normalizedLabKey)) {
      return res.status(400).json({ success: false, error: "Invalid labKey" });
    }

    const normalizedCreatorWallet = String(createdByWallet).toLowerCase().trim();
    const normalizedAssignedWallet = String(assignedToWallet || "").toLowerCase().trim();
    const creator = await User.findOne({ walletAddress: normalizedCreatorWallet });
    const creatorRole = normalizeRole(creator?.role);

    if (creatorRole === "member") {
      if (normalizedSource === "enterprise") {
        return res.status(403).json({ success: false, error: "Members can only create employee tasks" });
      }

      if (normalizedAssignedWallet && normalizedAssignedWallet !== normalizedCreatorWallet) {
        return res.status(403).json({ success: false, error: "Members can only assign tasks to themselves" });
      }
    }

    const finalAssignedWallet =
      creatorRole === "member" ? normalizedCreatorWallet : normalizedAssignedWallet;

    const task = await Task.create({
      title: String(title).trim(),
      description: String(description || "").trim(),
      organization: String(organization).trim(),
      labKey: normalizedLabKey,
      source: normalizedSource,
      createdByWallet: normalizedCreatorWallet,
      assignedToWallet: finalAssignedWallet,
      workDate: parsedWorkDate,
      endDate: parsedEndDate,
      durationDays,
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ success: false, error: "Failed to create task" });
  }
});

/**
 * POST /api/tasks/:taskId/submit
 * Employee submits completion evidence
 */
router.post("/:taskId/submit", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { walletAddress, submissionNote = "", evidenceUrl = "" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, error: "Invalid task id" });
    }

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: "walletAddress is required" });
    }

    const normalizedWallet = String(walletAddress).toLowerCase().trim();
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const now = new Date();
    const deadlinePassed = hasTaskDeadlinePassed(task, now);
    if (task.status === "open" && deadlinePassed) {
      task.status = "rejected";
      task.decidedByWallet = SYSTEM_DECISION_WALLET;
      task.resolvedAt = now;
      await task.save();
    }

    if (hasTaskDeadlinePassed(task, now)) {
      return res.status(400).json({
        success: false,
        error: "Task deadline has passed and can no longer be submitted",
      });
    }

    const isAssignee = task.assignedToWallet && task.assignedToWallet === normalizedWallet;
    const isCreator = task.createdByWallet === normalizedWallet;

    if (!isAssignee && !isCreator) {
      return res.status(403).json({ success: false, error: "Only assignee or creator can submit work" });
    }

    if (!["open", "rejected"].includes(task.status)) {
      return res.status(400).json({ success: false, error: "Task is not open for submission" });
    }

    task.submissionNote = String(submissionNote || "").trim();
    task.evidenceUrl = String(evidenceUrl || "").trim();
    task.status = "in_review";
    task.voteYes = 0;
    task.voteNo = 0;
    task.votedBy = [];
    task.decidedByWallet = "";
    task.resolvedAt = null;

    await task.save();

    res.json({ success: true, data: task });
  } catch (err) {
    console.error("Error submitting task:", err);
    res.status(500).json({ success: false, error: "Failed to submit task evidence" });
  }
});

/**
 * POST /api/tasks/:taskId/vote
 * Enterprise votes if work counts for the day
 */
router.post("/:taskId/vote", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { walletAddress, vote, voterRole = "member" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, error: "Invalid task id" });
    }

    const normalizedVote = String(vote || "").toLowerCase().trim();
    if (!["yes", "no"].includes(normalizedVote)) {
      return res.status(400).json({ success: false, error: "vote must be yes or no" });
    }

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: "walletAddress is required" });
    }

    const normalizedWallet = String(walletAddress).toLowerCase().trim();
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    if (task.status !== "in_review") {
      return res.status(400).json({ success: false, error: "Task is not under review" });
    }

    // Block voting only if you're the one who submitted the work (i.e., you are the assignee)
    if (task.assignedToWallet && task.assignedToWallet === normalizedWallet) {
      return res.status(400).json({ success: false, error: "You cannot vote on your own submitted work" });
    }

    if (task.votedBy.includes(normalizedWallet)) {
      return res.status(400).json({ success: false, error: "You already voted on this task" });
    }

    const normalizedRole = normalizeRole(voterRole);
    const voterRolesForTask = task.source === "enterprise" ? ["executive"] : ["affiliate", "executive"];
    
    // Voting permission logic
    // Enterprise tasks: only executives can vote
    // Employee tasks: executives and affiliates can vote
    if (task.source === "enterprise") {
      if (normalizedRole !== "executive") {
        return res.status(403).json({ success: false, error: "Only executives can vote on enterprise tasks" });
      }
    } else {
      if (!["affiliate", "executive"].includes(normalizedRole)) {
        return res.status(403).json({ success: false, error: "Only affiliates or executives can vote on employee tasks" });
      }
    }

    const { eligibleVoterCount, requiredVotes } = await computeVotingContext(task);
    task.eligibleVoterCount = eligibleVoterCount;
    task.requiredVotes = requiredVotes;

    const voterWeight =
      task.createdByWallet === normalizedWallet
        ? Math.max(1, CREATOR_VOTE_WEIGHT_PERCENT / 100)
        : 1;

    if (normalizedVote === "yes") {
      task.voteYes += 1;
      task.weightedVoteYes = Number(task.weightedVoteYes || 0) + voterWeight;
    } else {
      task.voteNo += 1;
      task.weightedVoteNo = Number(task.weightedVoteNo || 0) + voterWeight;
    }

    task.votedBy.push(normalizedWallet);

    const totalVotes = task.voteYes + task.voteNo;
    const totalWeightedVotes = Number(task.weightedVoteYes || 0) + Number(task.weightedVoteNo || 0);
    let thresholdReached = false;
    let approved = false;

    if (totalVotes >= requiredVotes) {
      thresholdReached = true;
      const yesPercent = totalWeightedVotes > 0 ? (Number(task.weightedVoteYes || 0) / totalWeightedVotes) * 100 : 0;
      approved = yesPercent >= REQUIRED_APPROVAL_PERCENT;
      task.status = approved ? "done" : "rejected";
      task.decidedByWallet = normalizedWallet;
      task.resolvedAt = new Date();
    }

    await task.save();

    res.json({
      success: true,
      data: {
        taskId: task._id,
        voteYes: task.voteYes,
        voteNo: task.voteNo,
        weightedVoteYes: Number(task.weightedVoteYes || 0),
        weightedVoteNo: Number(task.weightedVoteNo || 0),
        voterWeight,
        status: task.status,
        thresholdReached,
        approved,
        totalVotes,
        totalWeightedVotes,
        eligibleVoterCount,
        requiredVotes,
      },
    });
  } catch (err) {
    console.error("Error voting on task:", err);
    res.status(500).json({ success: false, error: "Failed to vote on task" });
  }
});

/**
 * POST /api/tasks/finalize-in-review
 * Finalize tasks already in review where voting thresholds are already met.
 */
router.post("/finalize-in-review", async (req, res) => {
  try {
    const { walletAddress } = req.body || {};
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: "walletAddress is required" });
    }

    const actor = await User.findOne({ walletAddress: String(walletAddress).toLowerCase().trim() });
    if (!actor || !["affiliate", "executive"].includes(normalizeRole(actor.role))) {
      return res.status(403).json({ success: false, error: "Only affiliates or executives can finalize tasks" });
    }

    const query = { status: "in_review" };
    if (actor.organization) {
      query.organization = String(actor.organization).trim();
    }

    const tasks = await Task.find(query);
    const finalized = [];
    for (const task of tasks) {
      const result = await finalizeTaskIfReady(task);
      if (result.finalized) {
        finalized.push({ taskId: task._id, status: task.status });
      }
    }

    res.json({
      success: true,
      data: {
        scanned: tasks.length,
        finalizedCount: finalized.length,
        finalized,
      },
    });
  } catch (err) {
    console.error("Error finalizing in-review tasks:", err);
    res.status(500).json({ success: false, error: "Failed to finalize in-review tasks" });
  }
});

module.exports = router;
