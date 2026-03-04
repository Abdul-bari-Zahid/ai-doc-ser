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
Analyze the following lab report text.
Context: Patient is in ${country}. Language: ${language}.
Suggest ONLY those medicines (brands/generics) that are EMINENTLY AVAILABLE and COMMON in ${country}. Prioritize trusted local brands.

IMPORTANT: Return the output PURELY as a valid JSON object. Do not include any markdown formatting (like \`\`\`json).

Required JSON Structure:
{
  "report_type": "Specific Report Name",
  "patient_information": {
    "name": "Name or null",
    "age": "Age or null",
    "sex": "Sex or null",
    "registration_number": "ID or null",
    "referred_by": "Doctor Name or null"
  },
  "report_details": {
    "lab_name": "Lab Name or null",
    "registered_on": "Date/Time or null",
    "collected_on": "Date/Time or null",
    "reported_on": "Date/Time or null"
  },
  "test_results": [
    {
      "test_name": "Test Name",
      "value": "Numeric/String Value",
      "numeric_value": 0.0, // Extract numeric value for graphing, or null if not applicable
      "unit": "Unit",
      "reference_range": "Range",
      "status": "Low/Normal/High/Critical",
      "flag": "L/H/C or null"
    }
  ],
  "interpretation_summary": {
    "overall_status": "Normal/Abnormal/Critical",
    "abnormal_findings": [
      {
        "parameter": "Test Name",
        "value": "Measured Value",
        "status": "High/Low",
        "clinical_significance": "Short explanation"
      }
    ],
    "normal_findings": ["List of normal parameters"]
  },
  "clinical_notes_from_lab": ["Note 1", "Note 2"],
  "diagnostic_pathologist_analysis": {
    "key_findings": ["Bullet point 1", "Bullet point 2"],
    "differential_diagnosis": ["Diagnosis 1", "Diagnosis 2"],
    "recommendations": ["Rec 1", "Rec 2"]
  },
  "medicineSuggestions": [
    { 
      "name": "Brand Name (e.g. Panadol)", 
      "formula": "Chemical Formula (e.g. Paracetamol)", 
      "purpose": "Brief reason for suggestion", 
      "link": "https://www.drugs.com/search.php?searchterm=Medicine+Name" // Provide a valid search URL or official link
    }
  ]
}
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
You are a Senior Diagnostic Pathologist.
Analyze this medical report image.
Context: Patient is in ${country}. Language: ${language}.
Suggest ONLY those medicines (brands/generics) that are EMINENTLY AVAILABLE and COMMON in ${country}. Prioritize trusted local brands.

IMPORTANT: Return the output PURELY as a valid JSON object. Do not include any markdown formatting.
Ensure "numeric_value" is a JSON number (not string) for graphing.

Required JSON Structure:
{
  "report_type": "Specific Report Name",
  "patient_information": {
    "name": "Name or null",
    "age": "Age or null",
    "sex": "Sex or null",
    "registration_number": "ID or null",
    "referred_by": "Doctor Name or null"
  },
  "report_details": {
    "lab_name": "Lab Name or null",
    "registered_on": "Date/Time or null",
    "collected_on": "Date/Time or null",
    "reported_on": "Date/Time or null"
  },
  "test_results": [
    {
      "test_name": "Test Name",
      "value": "Numeric/String Value",
      "numeric_value": 0.0, // Extract numeric value for graphing. EXAMPLE: if value is "15 g/dL", this is 15.
      "unit": "Unit",
      "reference_range": "Range",
      "status": "Low/Normal/High/Critical",
      "flag": "L/H/C or null"
    }
  ],
  "interpretation_summary": {
    "overall_status": "Normal/Abnormal/Critical",
    "abnormal_findings": [
      {
        "parameter": "Test Name",
        "value": "Measured Value",
        "status": "High/Low",
        "clinical_significance": "Short explanation"
      }
    ],
    "normal_findings": ["List of normal parameters"]
  },
  "clinical_notes_from_lab": ["Note 1", "Note 2"],
  "diagnostic_pathologist_analysis": {
    "key_findings": ["Bullet point 1", "Bullet point 2"],
    "differential_diagnosis": ["Diagnosis 1", "Diagnosis 2"],
    "recommendations": ["Rec 1", "Rec 2"]
  },
  "medicineSuggestions": [
    { 
      "name": "Brand Name (e.g. Panadol)", 
      "formula": "Chemical Formula (e.g. Paracetamol)", 
      "purpose": "Brief reason for suggestion", 
      "link": "https://www.drugs.com/search.php?searchterm=Medicine+Name" // Provide a valid search URL or official link
    }
  ]
}
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
You are a Senior Medical Consultant.
Analyze these patient vitals:
- Blood Pressure: ${vitals.bp}
- Blood Sugar: ${vitals.sugar} mg/dL
- Weight: ${vitals.weight} kg
- Notes: ${vitals.notes || "None"}

Context: Language: ${language}, Country: ${country}.

IMPORTANT: Return the output PURELY as a valid JSON object. Do not include any markdown formatting.

Required JSON Structure:
{
  "summary": "Short clinical summary of the user's status.",
  "analysis": {
    "overall_status": "Normal/At Risk/Critical",
    "bp_assessment": "Assessment of BP",
    "sugar_assessment": "Assessment of Sugar",
    "weight_assessment": "Assessment of Weight"
  },
  "keyFindings": [
    { "test": "Blood Pressure", "value": "${vitals.bp}", "numericValue": 0, "status": "Low/Normal/High", "unit": "mmHg" }, // Extract systolic as numericValue for graphing if possible, or just 0
    { "test": "Sugar", "value": "${vitals.sugar}", "numericValue": ${vitals.sugar}, "status": "Low/Normal/High", "unit": "mg/dL" },
    { "test": "Weight", "value": "${vitals.weight}", "numericValue": ${vitals.weight}, "status": "Normal/Overweight/Underweight", "unit": "kg" }
  ],
  "recommendations": ["Rec 1", "Rec 2"],
  "medicineSuggestions": [
    { 
      "name": "Best available Medicine Name in ${country}", 
      "formula": "Generic Formula", 
      "purpose": "Reason for suggestion", 
      "link": "https://www.drugs.com/search.php?searchterm=Medicine+Name" 
    }
  ]
}
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
