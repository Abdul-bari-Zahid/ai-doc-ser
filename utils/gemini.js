import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY/GOOGLE_API_KEY not set. AI features will be disabled.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const MODEL_NAME = "gemini-2.5-flash";

function logError(msg, err) {
  const logMsg = `[${new Date().toISOString()}] ${msg}: ${err.message}\n${err.stack}\n\n`;
  try {
    fs.appendFileSync("ai-errors.log", logMsg);
  } catch (e) {
    console.error("Failed to write to log file", e);
  }
  console.error(msg, err);
}

async function generateWithRetry(model, prompt, isImage = false, buffer = null, mimetype = null) {
  let retries = 3;
  console.log("🔄 generateWithRetry - isImage:", isImage);

  while (retries > 0) {
    try {
      const parts = isImage ? [{ text: prompt }, { inlineData: { data: buffer.toString("base64"), mimeType: mimetype } }] : prompt;
      console.log("📤 Sending request to Gemini...");

      const result = await model.generateContent(parts);
      const response = result.response;

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

      if (text && text.length > 0) {
        return text;
      } else {
        console.log("❌ Empty response from AI");
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

// --- BILL ANALYSIS FUNCTIONS ---

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
    const jsonStr = resultText?.match(/\{[\s\S]*\}/)?.[0];
    return jsonStr ? JSON.parse(jsonStr) : resultText;
  } catch (err) {
    logError("Bill Text AI error", err);
    return null;
  }
}

export async function analyzeBillImage(buffer, mimetype) {
  try {
    if (!genAI) throw new Error("GenAI client not initialized.");
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
Return ONLY valid JSON.`;

    const resultText = await generateWithRetry(model, prompt, true, buffer, mimetype);
    const jsonStr = resultText?.match(/\{[\s\S]*\}/)?.[0];
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (err) {
    logError("Bill Image AI error", err);
    return null;
  }
}

// --- MEDICAL REPORT FUNCTIONS ---

export async function analyzeReportText(text, language = "English", country = "Pakistan") {
  try {
    if (!genAI) throw new Error("GenAI client not initialized.");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1beta" });

    const prompt = `
You are a Distinguished Medical Consultant and Senior Diagnostic Pathologist with 30+ years of experience. 
Analyze the following lab report. Focus on ${country} availability for medicines.
Output ONLY JSON:
{
  "summary": "2-line summary",
  "keyFindings": [{"test": "Name", "value": "Value", "unit": "Unit", "status": "Low/Normal/High"}],
  "healthRisks": [],
  "suggestedActions": [],
  "severity": "Low/Medium/High",
  "recommendations": [],
  "medicineSuggestions": [{"name": "Name", "formula": "Formula", "purpose": "Why", "link": "link"}],
  "disclaimer": "AI generated."
}
Report Text:
${text}
`;
    const resultText = await generateWithRetry(model, prompt);
    const jsonStr = resultText?.match(/\{[\s\S]*\}/)?.[0];
    return jsonStr ? JSON.parse(jsonStr) : { summary: resultText };
  } catch (err) {
    logError("Medical Text AI error", err);
    return { summary: "AI analysis failed." };
  }
}

export async function analyzeReportImage(buffer, mimetype, language = "English", country = "Pakistan") {
  try {
    if (!genAI) throw new Error("GenAI client not initialized.");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1beta" });

    const prompt = `
You are a Senior Diagnostic Pathologist. Analyze this medical report image.
Context: Patient is in ${country}. Use ${language}.
Return ONLY JSON following the standard medical analysis schema.
`;
    const resultText = await generateWithRetry(model, prompt, true, buffer, mimetype);
    const jsonStr = resultText?.match(/\{[\s\S]*\}/)?.[0];
    return jsonStr ? JSON.parse(jsonStr) : { summary: resultText };
  } catch (err) {
    logError("Medical Image AI error", err);
    return { summary: "AI analysis failed." };
  }
}

export async function analyzeVitals(vitals, language = "English", country = "Pakistan") {
  try {
    if (!genAI) throw new Error("GenAI client not initialized.");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1beta" });

    const prompt = `
Analyze patient vitals: BP: ${vitals.bp}, Sugar: ${vitals.sugar}, Weight: ${vitals.weight}.
Language: ${language}, Country: ${country}.
Return JSON.
`;
    const resultText = await generateWithRetry(model, prompt);
    const jsonStr = resultText?.match(/\{[\s\S]*\}/)?.[0];
    return jsonStr ? JSON.parse(jsonStr) : { summary: resultText };
  } catch (err) {
    logError("Vitals AI error", err);
    return { summary: "Vitals analysis failed." };
  }
}

export async function analyzeWithGemini(prompt) {
  try {
    if (!genAI) throw new Error("GenAI client not initialized.");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1beta" });
    const resultText = await generateWithRetry(model, prompt);
    const jsonStr = resultText?.match(/\{[\s\S]*\}/)?.[0];
    return jsonStr ? JSON.parse(jsonStr) : resultText;
  } catch (err) {
    logError("Gemini General AI error", err);
    return null;
  }
}

export default {
  analyzeBillText,
  analyzeBillImage,
  analyzeReportText,
  analyzeReportImage,
  analyzeVitals,
  analyzeWithGemini
};
