require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { rateLimit } = require("express-rate-limit");
const connectDB = require("./config/db");

// ─── Import routes ──────────────────────────────────────────────────────────
const commitmentRoutes = require("./routes/commitment");
const proofRoutes = require("./routes/proof");
const voteRoutes = require("./routes/vote");

// ─── Initialize app ─────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Rate limiters ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  limit: 100,                  // 100 requests per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Try again later." },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,                   // 20 writes per 15 min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many submissions. Slow down." },
});

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,                   // 30 votes per 15 min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many votes. Try again later." },
});

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(globalLimiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/commitment", writeLimiter, commitmentRoutes);   // POST /api/commitment
app.use("/api/commitments", commitmentRoutes);                // GET  /api/commitments/:walletAddress
app.use("/api/proof", writeLimiter, proofRoutes);             // POST /api/proof/:commitmentId
app.use("/api/proofs", proofRoutes);                          // GET  /api/proofs/feed
app.use("/api/vote", voteLimiter, voteRoutes);                // POST /api/vote/:proofId

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ─── Start server ───────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 DDAT Backend running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();
