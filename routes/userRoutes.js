import express from "express";
import auth from "../middleware/authmiddleware.js";
// import index from "../index.js";
import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";

const router = express.Router();

router.get("/dashboard", auth, async (req, res) => {
  try {
    console.log("Dashboard: Fetching user for ID:", req.user.id);
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      console.log("Dashboard: User not found in DB");
      return res.status(404).json({ message: "User not found" });
    }
    console.log("Dashboard: User found:", user.email);
    res.json({
      message: "Welcome to dashboard",
      user: user,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ error: "Failed to fetch user", details: err.message });
  }
});

router.post("/settings", auth, async (req, res) => {
  try {
    const { language, country } = req.body;
    const userId = req.user.id || req.user._id;

    console.log("🛠️ SETTINGS UPDATE REQUEST:", {
      userId,
      decodedUser: req.user,
      payload: { language, country }
    });

    if (!userId) {
      console.error("❌ No User ID found in token payload");
      return res.status(401).json({ error: "Missing identity in token" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { language, country },
      { new: true }
    ).select("-password");

    if (!user) {
      console.error("❌ User not found in DB for ID:", userId);
      // Try searching by email as a final fallback if ID fails for some weird reason
      if (req.user.email) {
        console.log("🔍 Attempting fallback search by email:", req.user.email);
        const userByEmail = await User.findOneAndUpdate(
          { email: req.user.email },
          { language, country },
          { new: true }
        ).select("-password");

        if (userByEmail) {
          console.log("✅ Settings updated via email fallback");
          return res.json({ message: "Settings updated", user: userByEmail });
        }
      }
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Settings updated successfully for:", user.email);
    res.json({ message: "Settings updated", user });
  } catch (err) {
    console.error("❌ Critical error updating settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});
router.get("/uploadreport", auth, (req, res) => {
  res.json({
    message: "Welcome to uploadreport",
    user: req.user,
  });
});
router.get("/advitals", auth, (req, res) => {
  res.json({
    message: "Welcome to advitals",
    user: req.user,
  });
});
router.get("/timeline", auth, (req, res) => {
  res.json({
    message: "Welcome to timeline",
    user: req.user,
  });
});
router.get("/viewReport", auth, (req, res) => {
  res.json({
    message: "Welcome to viewReport",
    user: req.user,
  });
});

export default router;
