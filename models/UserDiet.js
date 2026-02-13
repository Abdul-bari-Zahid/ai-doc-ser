import mongoose from "mongoose";

const userDietSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "DietPlan", required: true },
    startDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ["active", "completed", "cancelled"],
        default: "active"
    },
    progress: { type: Number, default: 1 } // Day 1 to 10
});

export default mongoose.model("UserDiet", userDietSchema);
