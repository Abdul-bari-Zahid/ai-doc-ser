import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import auth from "../middleware/authmiddleware.js";
import Report from "../models/Report.js";
import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/chat", auth, async (req, res) => {
    try {
        const { message, history } = req.body;
        const userId = req.user.id || req.user._id;

        console.log("💬 CHAT START:", { userId, messageLength: message?.length });

        if (!userId) {
            console.error("❌ No User ID in token payload");
            return res.status(401).json({ error: "Unauthorized: Missing identity" });
        }

        // Fetch user
        console.log("🔍 Fetching user profile...");
        let user = await User.findById(userId);

        if (!user && req.user.email) {
            console.log("🔍 Attempting email fallback:", req.user.email);
            user = await User.findOne({ email: req.user.email });
        }

        if (!user) {
            console.error("❌ User not found in DB");
            return res.status(404).json({ error: "User not found" });
        }
        console.log("✅ User found:", user.email);

        const language = user.language || "English";
        const country = user.country || "Pakistan";

        // Fetch reports
        console.log("🔍 Fetching recent reports for context...");
        const recentReports = await Report.find({ userId: user._id })
            .sort({ reportDate: -1 })
            .limit(3);
        console.log(`✅ Found ${recentReports.length} reports`);

        const context = recentReports.map(r =>
            `Report Type: ${r.reportType}, Date: ${r.reportDate}, Summary: ${r.aiSummary}`
        ).join("\n");

        const prompt = `
You are a Distinguished Senior Medical Consultant named MediAI.
Language: ${language}
Country: ${country}
Prompt: ${message}
Context: ${context || "No history available."}

STRICT MEDICINE RULES:
- If suggesting medicines, ONLY suggest ones easily available in ${country}.
- Use MOST COMMON LOCAL BRAND NAMES specifically found in ${country} (e.g., if in Pakistan, suggest brands like Panadol, Arinac, etc.).
- Never suggest international brands that are not locally sold in ${country}.
`;

        console.log("🤖 Generating AI response with gemini-2.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ AI response generated successfully");
        res.json({ response: text });

    } catch (err) {
        console.error("❌ CRITICAL CHAT ERROR:", err);
        res.status(500).json({
            error: "AI Assistant error",
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

export default router;
