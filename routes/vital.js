import express from "express";
import Vitals from "../models/Vitals.js";
import User from "../models/User.js";
import dotenv from "dotenv";
import auth from "../middleware/authmiddleware.js"; // ✅ Add auth middleware
import { analyzeVitals } from "../utils/gemini.js";
dotenv.config();

const router = express.Router();

router.post("/add", auth, async (req, res) => {
  try {
    const { bp, sugar, weight, notes } = req.body;
    const userId = req.user.id || req.user._id;

    console.log("📦 Vitals received:", { userId, bp, sugar, weight });

    // Fetch user for global settings
    let user = await User.findById(userId);
    if (!user && req.user.email) {
      user = await User.findOne({ email: req.user.email });
    }

    const language = user?.language || "English";
    const country = user?.country || "Pakistan";

    let aiResult = { summary: "AI analysis not available." };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not found");
    } else {
      try {
        const vitalsData = { bp, sugar, weight, notes };
        aiResult = await analyzeVitals(vitalsData, language, country);
      } catch (e) {
        console.error("AI ERROR:", e.message);
        aiResult = { summary: "AI processing error.", error: e.message };
      }
    }

    const newVitals = await Vitals.create({
      userId: userId,
      bp,
      sugar,
      weight,
      notes,
      aiResult: aiResult.summary || "Health analysis processed successfully.",
      structuredData: aiResult,
      language
    });

    res.json({
      message: "Vitals saved and AI result generated ✅",
      vitals: newVitals
    });
  } catch (err) {
    console.error("❌ Vitals route error:", err);
    res.status(500).json({ error: "Server error ❌" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const userVitals = await Vitals.find({ userId: req.user.id }).sort({ createdAt: -1 }); // ✅ Filter by user ID
    res.json(userVitals);
  } catch (err) {
    res.status(500).json({ error: "Server error ❌" });
  }
});

export default router;
