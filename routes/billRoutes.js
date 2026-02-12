import express from "express";
import upload from "../middleware/upload.js";
import auth from "../middleware/authmiddleware.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import Bill from "../models/Bill.js";
import pdfParse from "pdf-parse";
import { analyzeBillText, analyzeBillImage } from "../utils/gemini.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

const router = express.Router();

// Upload bill
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { billType } = req.body;
    const cloudRes = await uploadToCloudinary(req.file.buffer);

    let aiData = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        if (req.file.mimetype === "application/pdf") {
          const pdfData = await pdfParse(req.file.buffer);
          aiData = await analyzeBillText(pdfData.text);
        } else if (req.file.mimetype.startsWith("image/")) {
          aiData = await analyzeBillImage(req.file.buffer, req.file.mimetype);
        }
      } catch (e) {
        console.error("AI ERROR:", e);
      }
    }

    const bill = await Bill.create({
      userId: req.user.id,
      fileUrl: cloudRes.secure_url,
      billType: aiData?.billType || billType || "Other",
      billDate: aiData?.billDate || new Date(),
      totalAmount: aiData?.totalAmount || 0,
      taxes: aiData?.taxes || [],
      aiSummary: aiData?.summary || "Analysis completed.",
      analysis: aiData?.analysis || "",
      suggestions: Array.isArray(aiData?.suggestions) ? aiData.suggestions : [],
      graphData: aiData?.graphData || null,
    });

    console.log("✅ Bill created successfully:");
    console.log("- ID:", bill._id);
    console.log("- Type:", bill.billType);
    console.log("- Amount:", bill.totalAmount);
    console.log("- AI Data:", aiData ? "✅ Present" : "❌ Null");

    res.json({ msg: "Bill Analyzed ✅", bill });
  } catch (err) {
    console.error("❌ Upload error:", err);
    if (err.name === "ValidationError") {
      console.error("Mongoose Validation Error:", JSON.stringify(err.errors, null, 2));
      return res.status(400).json({ error: "Invalid data extracted from bill" });
    }
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

// Get all bills of current user
router.get("/user", auth, async (req, res) => {
  try {
    const bills = await Bill.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    console.error("❌ Fetch user bills error:", err);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

// Get single bill by ID
router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID" });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    if (bill.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(bill);
  } catch (err) {
    console.error(" /bills/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
