
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import mongoose from "mongoose";

// Disable buffering globally BEFORE importing any models/routes
mongoose.set("bufferCommands", false);

import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import billSuggestionRoutes from "./routes/billSuggestionRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import vital from "./routes/vital.js";
import aiRoutes from "./routes/aiRoutes.js";
import dietRoutes from "./routes/dietRoutes.js";

dotenv.config();

// --- ENV VAR CHECK ---
console.log("🔍 Checking Environment Variables...");
if (!process.env.MONGO_URI) {
  console.error("❌ FATAL: MONGO_URI is not defined.");
} else {
  console.log("✅ MONGO_URI is defined.");
}

if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not defined.");
} else {
  console.log("✅ JWT_SECRET is defined.");
}

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ WARNING: GEMINI_API_KEY is not defined. AI features will fail.");
}
// ---------------------

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

const app = express();

app.use(cors({ origin: ["http://localhost:5173", "https://ai-doc-client.vercel.app"], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.get("/", (req, res) => {
  res.send("Welcome to AI Doc API");
})
app.use("/api/users", userRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/bill-suggestions", billSuggestionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/vitals", vital);
app.use("/api/ai", aiRoutes);
app.use("/api/diet", dietRoutes);

// Connection Event Listeners
mongoose.connection.on("connected", () => console.log("Mongoose connected to DB ✅"));
mongoose.connection.on("error", (err) => console.error("Mongoose connection error ❌:", err));
mongoose.connection.on("disconnected", () => console.log("Mongoose disconnected 🔌"));

const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB... ⏳");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    });
  } catch (err) {
    console.error("MongoDB Initial Connection Error: ❌", err.message);
    if (err.message.includes("queryTxt ETIMEOUT")) {
      console.error("💡 DNS Error: Changing network or using a long connection string usually fixes this.");
    }
    setTimeout(connectDB, 10000);
  }
};

const startServer = async () => {
  try {
    // Start DB connection in background to avoid blocking port listening
    connectDB();

    const port = process.env.PORT || 5000;
    const server = app.listen(port, () => {
      console.log(`🚀 Server running on port ${port} ✅`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use.`);
      } else {
        console.error("❌ Server Error:", err);
      }
    });

  } catch (err) {
    console.error("❌ Critical Server Startup Error:", err);
  }
};

startServer();
