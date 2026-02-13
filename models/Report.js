


import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fileUrl: String,
    reportType: String,
    reportDate: Date,
    aiSummary: String,
    structuredData: mongoose.Schema.Types.Mixed,
    language: { type: String, default: "English" },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
