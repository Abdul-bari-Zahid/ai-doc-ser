// // server/routes/reportRoutes.js
// import express from "express";
// import upload from "../middleware/upload.js";
// import auth from "../middleware/authmiddleware.js";
// import { uploadToCloudinary } from "../config/cloudinary.js";
// import Report from "../models/Report.js";
// import pdfParse from "pdf-parse";
// import { analyzeReportText, analyzeReportImage } from "../utils/gemini.js"; // ✅ change file
// import dotenv from "dotenv";
// dotenv.config();

// const router = express.Router();

// router.post("/upload", auth, upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: "No file uploaded" });

//     console.log("📁 File received:", req.file);
//     console.log("📦 Body received:", req.body);

//     const { reportType, reportDate } = req.body;

//     // ✅ Upload file to Cloudinary
//     const cloudRes = await uploadToCloudinary(req.file.buffer);

//     let aiSummary = "AI analysis not available.";

//     // ✅ Check API key
//     if (!process.env.GEMINI_API_KEY) {
//       console.warn("⚠️ GEMINI_API_KEY not found");
//     } else {
//       try {
//         // ✅ If PDF
//         if (req.file.mimetype === "application/pdf") {
//           const pdfData = await pdfParse(req.file.buffer);
//           aiSummary = await analyzeReportText(pdfData.text);
//         } else if (req.file.mimetype.startsWith("image/")) {
//           // ✅ Send image buffer to Gemini Vision
//           aiSummary = await analyzeReportImage(req.file.buffer, req.file.mimetype);
//         }
//       } catch (e) {
//         console.error("AI ERROR:", e.message);
//         aiSummary = "AI processing error.";
//       }
//     }

//     // ✅ Save in DB
//     const report = await Report.create({
//       userId: req.user.id,
//       fileUrl: cloudRes.secure_url,
//       reportType,
//       reportDate,
//       aiSummary,
//     });

//     res.json({ msg: "Uploaded ✅", report });
//   } catch (err) {
//     console.error("❌ Upload error:", err);
//     res.status(500).json({ error: "Upload failed" });
//   }
// });

// export default router;



// import express from "express";
// import upload from "../middleware/upload.js";
// import auth from "../middleware/authmiddleware.js";
// import { uploadToCloudinary } from "../config/cloudinary.js";
// import Report from "../models/Report.js";
// import pdfParse from "pdf-parse";
// import { analyzeReportText, analyzeReportImage } from "../utils/gemini.js";
// import dotenv from "dotenv";
// dotenv.config();

// const router = express.Router();

// // ✅ Upload report
// router.post("/upload", auth, upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: "No file uploaded" });

//     const { reportType, reportDate } = req.body;
//     const cloudRes = await uploadToCloudinary(req.file.buffer);

//     let aiSummary = "AI analysis not available.";
//     if (process.env.GEMINI_API_KEY) {
//       try {
//         if (req.file.mimetype === "application/pdf") {
//           const pdfData = await pdfParse(req.file.buffer);
//           aiSummary = await analyzeReportText(pdfData.text);
//         } else if (req.file.mimetype.startsWith("image/")) {
//           aiSummary = await analyzeReportImage(req.file.buffer, req.file.mimetype);
//         }
//       } catch (e) {
//         console.error("AI ERROR:", e.message);
//         aiSummary = "AI processing error.";
//       }
//     }

//     const report = await Report.create({
//       userId: req.user.id,
//       fileUrl: cloudRes.secure_url,
//       reportType,
//       reportDate,
//       aiSummary,
//     });

//     res.json({ msg: "Uploaded ✅", report });
//   } catch (err) {
//     console.error("❌ Upload error:", err);
//     res.status(500).json({ error: "Upload failed" });
//   }
// });

// // ✅ New route: Get all reports of current user
// router.get("/user", auth, async (req, res) => {
//   try {
//     const reports = await Report.find({ userId: req.user.id }).sort({ createdAt: -1 });
//     res.json(reports);
//   } catch (err) {
//     console.error("❌ Fetch user reports error:", err);
//     res.status(500).json({ error: "Failed to fetch reports" });
//   }
// });

// // ✅ New route for fetching single report by ID
// // router.get("/:id", auth, async (req, res) => {
// //   try {
// //     const report = await Report.findById(req.params.id);
// //     if (!report) return res.status(404).json({ message: "Report not found" });

// //     // Check if report belongs to current user
// //     if (report.userId.toString() !== req.user.id)
// //       return res.status(403).json({ message: "Forbidden" });

// //     res.json(report);
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // });


// // const router = express.Router();

// // GET single report by ID
// router.get("/:id", auth, async (req, res) => {
//   try {
//     const report = await Report.findById(req.params.id);
//     if (!report) return res.status(404).json({ message: "Report not found" });

//     // Ensure the current user owns this report
//     if (report.userId.toString() !== req.user.id) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     res.json(report);
//   } catch (err) {
//     console.error(" /reports/:id error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// export default router;



import express from "express";
import upload from "../middleware/upload.js";
import auth from "../middleware/authmiddleware.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import Report from "../models/Report.js";
import pdfParse from "pdf-parse";
import { analyzeReportText, analyzeReportImage } from "../utils/gemini.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
dotenv.config();

const router = express.Router();

// Upload report
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Fetch user for their saved country and language
    const user = await User.findById(req.user.id);
    const { reportType, reportDate } = req.body;
    const language = req.body.language || user.language || "English";
    const country = user.country || "Pakistan";

    const cloudRes = await uploadToCloudinary(req.file.buffer);

    let aiResult = { summary: "AI analysis not available." };
    if (process.env.GEMINI_API_KEY) {
      try {
        if (req.file.mimetype === "application/pdf") {
          const pdfData = await pdfParse(req.file.buffer);
          aiResult = await analyzeReportText(pdfData.text, language, country);
        } else if (req.file.mimetype.startsWith("image/")) {
          aiResult = await analyzeReportImage(req.file.buffer, req.file.mimetype, language, country);
        }
      } catch (e) {
        console.error("AI ERROR:", e);
        aiResult = { summary: e?.message || e || "AI processing error.", error: true };
      }
    }

    const report = await Report.create({
      userId: req.user.id,
      fileUrl: cloudRes.secure_url,
      reportType,
      reportDate,
      aiSummary: aiResult.summary || JSON.stringify(aiResult),
      structuredData: aiResult,
      language: language,
    });

    res.json({ msg: "Uploaded ✅", report });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Get all reports of current user
router.get("/user", auth, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error("❌ Fetch user reports error:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Get single report by ID
router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (report.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(report);
  } catch (err) {
    console.error(" /reports/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
