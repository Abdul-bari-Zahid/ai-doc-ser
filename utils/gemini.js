// utils/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();

function logError(msg, err) {
  const logMsg = `[${new Date().toISOString()}] ${msg}: ${err.message}\n${err.stack}\n\n`;
  try {
    fs.appendFileSync("ai-errors.log", logMsg);
  } catch (e) {
    console.error("Failed to write to log file", e);
  }
  console.error(msg, err);
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const MODEL_NAME = "gemini-2.5-flash";

async function generateWithRetry(model, prompt, isImage = false, buffer = null, mimetype = null) {
  let retries = 3;
  console.log("🔄 generateWithRetry - isImage:", isImage);

  while (retries > 0) {
    try {
      const parts = isImage ? [{ text: prompt }, { inlineData: { data: buffer.toString("base64"), mimeType: mimetype } }] : prompt;
      console.log("📤 Sending request to Gemini...");

      const result = await model.generateContent(parts);
      console.log("📥 Result object keys:", Object.keys(result));

      const response = result.response;
      console.log("📥 Response object keys:", Object.keys(response));
      console.log("📥 Response candidates:", response.candidates?.length);

      // Try to get text from response
      let text = "";
      try {
        if (typeof response.text === 'function') {
          text = response.text();
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = response.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        console.log("⚠️ Error extracting text:", e.message);
      }

      console.log("✅ Response text length:", text?.length);
      if (text && text.length > 0) {
        console.log("📝 First 200 chars:", text.substring(0, 200));
        return text;
      } else {
        console.log("❌ Empty response, full response:", JSON.stringify(response, null, 2));
        return null;
      }
    } catch (err) {
      console.log("❌ Error in generateWithRetry:", err.message);
      if (err.message.includes("429") && retries > 1) {
        console.log(`⏳ Rate limited. Retrying in 2s... (${retries - 1} left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries--;
      } else {
        throw err;
      }
    }
  }
  return null;
}

// 🧾 BILL TEXT AI
export async function analyzeBillText(text) {
  try {
    if (!genAI) throw new Error("GenAI client not initialized.");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1beta" });

    const prompt = `
You are a Bill Analysis AI. Return output ONLY in JSON format:
{
  "billType": "Electricity/Water/Gas/Internet/Phone/Other",
  "billDate": "YYYY-MM-DD",
  "totalAmount": 0.00,
  "currency": "USD",
  "taxes": [{"name": "Name", "amount": 0.00}],
  "summary": "Overview",
  "analysis": "Specific details",
  "suggestions": ["Step 1", "Step 2"],
  "graphData": {
    "labels": ["L1", "L2"],
    "datasets": [{"label": "Cost Breakdown", "data": [1, 2]}]
  }
}
Analyze this bill:
${text}
`;

    const resultText = await generateWithRetry(model, prompt);

    try {
      const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0];
      if (jsonStr) return JSON.parse(jsonStr);
    } catch (e) {
      console.warn("JSON parse failed", e);
    }
    return resultText;
  } catch (err) {
    logError("Bill Text AI error", err);
    return null;
  }
}

// 🖼️ BILL IMAGE AI
export async function analyzeBillImage(buffer, mimetype) {
  try {
    console.log("📸 analyzeBillImage called");
    console.log("- Buffer size:", buffer?.length, "bytes");
    console.log("- Mimetype:", mimetype);

    if (!buffer || buffer.length < 100) {
      console.log("❌ Buffer too small or missing");
      return null;
    }

    if (!genAI) {
      console.log("❌ GenAI client not initialized");
      throw new Error("GenAI client not initialized.");
    }

    console.log("✅ Creating model:", MODEL_NAME);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1beta" });

    const prompt = `Analyze this bill image and extract the following information in JSON format:
{
  "billType": "Electricity/Water/Gas/Internet/Phone/Other",
  "billDate": "YYYY-MM-DD",
  "totalAmount": <number>,
  "currency": "PKR or USD",
  "taxes": [{"name": "tax name", "amount": <number>}],
  "summary": "Brief overview of the bill",
  "analysis": "Detailed analysis",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}

Extract the total amount, bill type, date, and all charges/taxes. Return ONLY valid JSON.`;

    console.log("🚀 Calling Gemini API...");
    const resultText = await generateWithRetry(model, prompt, true, buffer, mimetype);
    console.log("✅ API Response received, length:", resultText?.length);

    if (resultText && resultText.length > 0) {
      const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0];
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        console.log("✅ JSON parsed successfully");
        console.log("📊 Total amount:", parsed.totalAmount);
        return parsed;
      }
      console.log("⚠️ No JSON found in response");
      return null;
    }

    console.log("❌ No result text from API");
    return null;
  } catch (err) {
    logError("Bill Image AI error", err);
    console.log("❌ Full error:", err.message);
    return null;
  }
}

// 🔮 GENERAL AI TASK
export async function analyzeWithGemini(prompt) {
  try {
    if (!genAI) throw new Error("GenAI client not initialized.");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1beta" });

    const resultText = await generateWithRetry(model, prompt);

    try {
      const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0];
      if (jsonStr) return JSON.parse(jsonStr);
    } catch (e) { }

    return resultText;
  } catch (err) {
    logError("Gemini General AI error", err);
    return null;
  }
}

export default { analyzeBillText, analyzeBillImage, analyzeWithGemini };
