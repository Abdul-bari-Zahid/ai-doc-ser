
// utils/gemini.js
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY/GOOGLE_API_KEY not set. AI features will be disabled.");
}
const genAI = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// 🧾 TEXT REPORT AI
export async function analyzeReportText(text) {
  try {
    if (!genAI) {
      throw new Error("GenAI client not initialized (missing API key).");
    }

    const prompt = `
You are a medical lab report analysis AI.

Return output ONLY in this markdown format:

## 📄 Report Summary
- <2 line brief summary>

## 🧪 Key Findings
- Hemoglobin: xx (Low/Normal/High)
- PCV: xx (Low/Normal/High)
- Platelets: xx (Low/Normal/High)
- Other key values if present

## 🚨 Possible Health Risks
- ...

## 🩺 Suggested Actions
- ...
- ...
- ...

## ⚠️ Severity
Low / Medium / High

### ❗ Disclaimer
AI generated. Consult a doctor.

Analyze this report:
${text}
`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return response.text ?? (response?.outputs?.[0]?.text) ?? "AI returned no text.";

  } catch (err) {
    console.error("Text AI error:", err);
    return "AI analysis failed.";
  }
} 


// 🖼️ IMAGE REPORT AI
export async function analyzeReportImage(buffer, mimetype) {
  try {
    if (!buffer || buffer.length < 100) {
      return "❌ Invalid image file. Upload again.";
    }

    if (!genAI) {
      throw new Error("GenAI client not initialized (missing API key).");
    }

    const base64Image = buffer.toString("base64");

    const prompt = `
You are a medical lab report analysis AI.

Return only markdown in this format:

### Report Summary
- 1–2 line high-level summary

### Key Findings
- Test: value (Low/Normal/High)

### Possible Health Risks
- ...

### Suggested Actions
- ...
- ...
- ...

### Severity
Low / Medium / High

### Disclaimer
AI generated. Consult a doctor.
`;

    console.debug("Image AI request: mime=", mimetype, "size=", buffer.length);

    try {
      // Use ``contents`` with inlineData parts for image + text (required shape)
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Image, mimeType: mimetype } },
              { text: prompt }
            ]
          }
        ]
      });

      // SDK may return .text or .outputs[0].text depending on version
      const text = response.text ?? (response?.outputs?.[0]?.text);
      if (text) return text;

      console.warn("models.generateContent returned no text, inspecting full response:", response);

    } catch (primaryErr) {
      console.warn("models.generateContent failed for image (will try interactions API):", primaryErr);
      // continue to interactions fallback
    }

    // Fallback: attempt interactions API which handles multimodal input reliably
    try {
      const interaction = await genAI.interactions.create({
        model: "gemini-2.5-flash",
        input: [
          { type: "image", data: base64Image, mime_type: mimetype },
          { type: "text", text: prompt }
        ]
      });

      console.debug("Interactions API response:", interaction);

      const texts = [];
      for (const out of interaction.outputs ?? []) {
        if (out.type === "text" && out.text) texts.push(out.text);
        if (out.type === "message" && out.text) texts.push(out.text);
        if (out.type === "function_call" && out.arguments) texts.push(JSON.stringify(out.arguments));
      }

      if (texts.length) return texts.join("\n\n");

      console.warn("Interactions API returned no text outputs", interaction);
      return "AI returned no text.";

    } catch (interactionErr) {
      console.error("❌ Image AI error (interactions fallback):", interactionErr);
      if (interactionErr?.status) console.error("status:", interactionErr.status);
      if (interactionErr?.message) console.error("message:", interactionErr.message);
      const apiMsg = interactionErr?.error?.message ?? interactionErr?.message ?? "Unable to process image";
      return `Error analyzing image report: ${apiMsg}`;
    }

  } catch (err) {
    console.error("❌ Image AI error (final):", err);
    if (err?.status) console.error("Status:", err.status);
    if (err?.details) console.error("Details:", err.details);
    const apiMsg = err?.error?.error?.message ?? err?.message ?? "Unknown error";
    return `Error analyzing image report: ${apiMsg}`;
  }
}

export default { analyzeReportText, analyzeReportImage };






