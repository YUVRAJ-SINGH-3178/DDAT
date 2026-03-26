const Task = require("../models/Task");

const DEFAULT_DEADLINE_SWEEP_MS = Number(process.env.TASK_DEADLINE_SWEEP_MS || 60_000);
const SYSTEM_DECISION_WALLET = "system_deadline";

function buildExpiredOpenTasksQuery(now = new Date()) {
  return {
    status: "open",
    $or: [
      { endDate: { $ne: null, $lt: now } },
      { endDate: null, workDate: { $lt: now } },
    ],
  };
}

async function rejectExpiredOpenTasks(now = new Date()) {
  const result = await Task.updateMany(
    buildExpiredOpenTasksQuery(now),
    {
      $set: {
        status: "rejected",
        decidedByWallet: SYSTEM_DECISION_WALLET,
        resolvedAt: now,
      },
    }
  );

  return result.modifiedCount || 0;
}

function startTaskDeadlineWatcher(options = {}) {
  const intervalMs = Number(options.intervalMs || DEFAULT_DEADLINE_SWEEP_MS);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("TASK_DEADLINE_SWEEP_MS must be a positive number");
  }

  const runSweep = async () => {
    try {
      const rejectedCount = await rejectExpiredOpenTasks();
      if (rejectedCount > 0) {
        console.log(`[task-deadline] Auto-rejected ${rejectedCount} overdue task(s)`);
      }
    } catch (error) {
      console.error("[task-deadline] Sweep failed:", error.message);
    }
  };

  void runSweep();
  const timer = setInterval(() => {
    void runSweep();
  }, intervalMs);
  timer.unref();

  return timer;
}

module.exports = {
  SYSTEM_DECISION_WALLET,
  rejectExpiredOpenTasks,
  startTaskDeadlineWatcher,
};
