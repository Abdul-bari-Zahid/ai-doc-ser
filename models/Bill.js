import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fileUrl: String,
    billType: { type: String, default: "Other" },
    billDate: Date,
    totalAmount: { type: Number, default: 0 },
    taxes: [
      {
        name: String,
        amount: Number,
      }
    ],
    aiSummary: String,
    analysis: String,
    suggestions: [String],
    graphData: {
      labels: [String],
      datasets: [
        {
          label: String,
          data: [Number],
        }
      ]
    }
  },
  { timestamps: true }
);

export default mongoose.model("Bill", billSchema);
