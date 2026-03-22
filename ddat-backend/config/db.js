const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  const maxRetries = Number(process.env.MONGODB_CONNECT_RETRIES || 10);
  const retryDelayMs = Number(process.env.MONGODB_CONNECT_RETRY_DELAY_MS || 3000);
  const ipFamily = Number(process.env.MONGODB_IP_FAMILY || 4);

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        family: ipFamily,
      });

      console.log(`✅ MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on("disconnected", () => {
        console.error("⚠️  MongoDB disconnected. Waiting for automatic reconnect...");
      });

      mongoose.connection.on("reconnected", () => {
        console.log("✅ MongoDB reconnected");
      });

      mongoose.connection.on("error", (error) => {
        console.error("❌ MongoDB runtime error:", error.message);
      });

      return;
    } catch (error) {
      lastError = error;
      console.error(
        `❌ MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw new Error(`MongoDB connection failed after ${maxRetries} attempts: ${lastError?.message || "unknown error"}`);
};

module.exports = connectDB;
