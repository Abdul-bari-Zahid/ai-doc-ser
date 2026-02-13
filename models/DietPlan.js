import mongoose from "mongoose";

const dietPlanSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true }, // e.g., Weight Loss, Diabetic, High Protein
    benefits: [String],
    pros: [String],
    cons: [String],
    days: [
        {
            day: Number,
            breakfast: String,
            lunch: String,
            dinner: String,
            snack: String,
            instruction: String
        }
    ],
    isAiGenerated: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("DietPlan", dietPlanSchema);
