import mongoose from "mongoose";

const customBillSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  billCategory: { type: String, default: "Electricity" },
  totalUnits: Number, // e.g., kWh for electricity
  previousAmount: Number,
  currentAmount: Number,
  taxes: [
    {
      name: String,
      amount: Number
    }
  ],
  notes: String,
  aiSuggestion: String,
  savingsEstimate: Number,
  graphData: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("CustomBill", customBillSchema);
