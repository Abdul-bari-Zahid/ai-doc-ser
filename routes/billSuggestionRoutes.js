import express from "express";
import CustomBill from "../models/CustomBill.js";
import { analyzeWithGemini } from "../utils/gemini.js";
import auth from "../middleware/authmiddleware.js";

const router = express.Router();

router.post("/add", auth, async (req, res) => {
  try {
    const { billCategory, totalUnits, currentAmount, previousAmount, notes } = req.body;

    const promptText = `
Analyze this ${billCategory} bill:
Current Amount: ${currentAmount}
Previous Amount: ${previousAmount}
Units Consumed: ${totalUnits}
Notes: ${notes}

Provide optimization suggestions to reduce this bill. 
Return ONLY JSON format:
{
  "aiSuggestion": "Detailed multi-line suggestion",
  "savingsEstimate": 150.00,
  "taxes": [{"name": "Estimated Tax", "amount": 20.00}],
  "graphData": {
    "labels": ["Current", "Previous", "Potential Savings"],
    "datasets": [{"label": "Amount", "data": [${currentAmount}, ${previousAmount}, 150.00]}]
  }
}
`;

    let aiData = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        aiData = await analyzeWithGemini(promptText); // Reusing text analysis for JSON
      } catch (e) {
        console.error("AI ERROR:", e.message);
      }
    }

    const newBill = await CustomBill.create({
      userId: req.user.id,
      billCategory,
      totalUnits,
      currentAmount,
      previousAmount,
      notes,
      taxes: aiData?.taxes || [],
      aiSuggestion: aiData?.aiSuggestion || "Try reducing non-essential usage.",
      savingsEstimate: aiData?.savingsEstimate || 0,
      graphData: aiData?.graphData || null
    });

    res.json({
      message: "Bill optimization suggestion generated ✅",
      bill: newBill
    });
  } catch (err) {
    console.error("❌ Bill suggestion route error:", err);
    res.status(500).json({ error: "Server error ❌" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const userBills = await CustomBill.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(userBills);
  } catch (err) {
    res.status(500).json({ error: "Server error ❌" });
  }
});

export default router;
