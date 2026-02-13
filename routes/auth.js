import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();

//  Register API
router.post("/register", async (req, res) => {
  try {
    console.log("📝 Register Request:", req.body);
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      console.warn("⚠️ Register: User already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    console.log("✅ User registered:", user._id);

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "User registered",
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error("❌ Register Error:", err);
    res.status(500).json({ error: err.message });
  }
});

//  Login API
router.post("/login", async (req, res) => {
  try {
    console.log("🔑 Login Request for:", req.body.email);
    const { email, password } = req.body;

    console.log("🔍 Finding user in DB...");
    const user = await User.findOne({ email });

    if (!user) {
      console.warn("❌ Login: User not found");
      return res.status(400).json({ message: "User not found" });
    }

    console.log("🔐 Verifying password...");
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.warn("❌ Login: Invalid password");
      return res.status(400).json({ message: "Invalid password" });
    }

    console.log("✅ Password verified. Generating token...");
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("🚀 Login successful. Sending response.");
    res.json({
      message: "Login success",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("❌ Login Critical Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

export default router;
