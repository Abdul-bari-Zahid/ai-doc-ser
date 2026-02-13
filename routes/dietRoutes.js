import express from "express";
import DietPlan from "../models/DietPlan.js";
import UserDiet from "../models/UserDiet.js";
import auth from "../middleware/authmiddleware.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const seedDietPlans = async () => {
    const diets = [
        {
            name: "Heart-Healthy Low Sodium Diet",
            description: "A clinical diet focused on reducing blood pressure and improving cardiovascular health by limiting sodium and saturated fats.",
            category: "Heart Health",
            benefits: ["Lower Blood Pressure", "Reduced Cholesterol", "Better Heart Function"],
            pros: ["Clinically proven for hypertension", "Rich in fiber and minerals"],
            cons: ["Requires strictly avoiding processed foods", "Lower salt taste may take time to adapt"],
            days: Array.from({ length: 10 }, (_, i) => ({
                day: i + 1,
                breakfast: "Oatmeal with fresh berries and flaxseeds",
                lunch: "Grilled chicken salad with olive oil and lemon dressing",
                dinner: "Baked salmon with steamed broccoli and quinoa",
                snack: "Unsalted almonds or a piece of fruit",
                instruction: "Do not add table salt. Use herbs and spices for flavor."
            }))
        },
        {
            name: "Standard Diabetic Control Diet",
            description: "Designed to maintain stable blood glucose levels using low-glycemic index foods and frequent small meals.",
            category: "Diabetic",
            benefits: ["Blood Sugar Stability", "Reduced Insulin Spikes", "Sustained Energy"],
            pros: ["Prevents sugar crashes", "Highly structured"],
            cons: ["Requires precise portion control", "Zero white sugar allowed"],
            days: Array.from({ length: 10 }, (_, i) => ({
                day: i + 1,
                breakfast: "Scrambled eggs with spinach and whole-grain toast",
                lunch: "Lentil soup (Daal) with a small portion of brown rice",
                dinner: "Grilled fish with a large green salad",
                snack: "Low-fat Greek yogurt with nuts",
                instruction: "Monitor sugar levels 2 hours after lunch."
            }))
        },
        ...["Weight Loss", "Muscle Gain", "Keto", "Paleo", "Vegan", "Gluten-Free", "DASH", "Mediterranean", "Anti-Aging"].flatMap(cat => [
            {
                name: `${cat} Plan Alpha`,
                description: `A specialized ${cat} diet for beginners focusing on core principles and easy meals.`,
                category: cat,
                benefits: [`Improved ${cat} balance`, "Overall wellness"],
                pros: ["Simple", "Effective"],
                cons: ["Specific restrictions"],
                days: Array.from({ length: 10 }, (_, i) => ({
                    day: i + 1,
                    breakfast: `Healthy ${cat} Breakfast`,
                    lunch: `Nutritious ${cat} Lunch`,
                    dinner: `Light ${cat} Dinner`,
                    snack: `Energy ${cat} Snack`,
                    instruction: "Consistency is key."
                }))
            },
            {
                name: `${cat} Advanced System`,
                description: `An advanced 10-day intensive ${cat} regimen for maximum clinical results.`,
                category: cat,
                benefits: ["Maximum performance", "Deep detoxification"],
                pros: ["Highest efficiency", "Rapid change"],
                cons: ["Intense", "Requires prep"],
                days: Array.from({ length: 10 }, (_, i) => ({
                    day: i + 1,
                    breakfast: `Intense ${cat} Morning Fuel`,
                    lunch: `Advanced ${cat} Power Bowl`,
                    dinner: `Muscle-Repair ${cat} Meal`,
                    snack: `High-Density ${cat} Nutrients`,
                    instruction: "No cheats allowed."
                }))
            },
            {
                name: `${cat} Recovery Mode`,
                description: `Gentle ${cat} approach for those recovering from illness or physical stress.`,
                category: cat,
                benefits: ["Healing", "Gentle metabolism"],
                pros: ["Easy on digestion", "Comforting"],
                cons: ["Slower progress"],
                days: Array.from({ length: 10 }, (_, i) => ({
                    day: i + 1,
                    breakfast: `Soothing ${cat} Warmth`,
                    lunch: `Easy-Digest ${cat} Protein`,
                    dinner: `Nourishing ${cat} Stew`,
                    snack: `Hydrating ${cat} Boost`,
                    instruction: "Listen to your body."
                }))
            }
        ])
    ].slice(0, 30);

    await DietPlan.deleteMany({});
    await DietPlan.insertMany(diets);
};

// 🛠️ Seeding Route
router.get("/seed", async (req, res) => {
    try {
        await seedDietPlans();
        res.json({ message: "Seeded 30 diets successfully! ✅" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📋 List all diet plans
router.get("/", auth, async (req, res) => {
    try {
        let plans = await DietPlan.find().select("-days");

        // Auto-seed if empty
        if (plans.length === 0) {
            console.log("No diet plans found, auto-seeding...");
            await seedDietPlans();
            plans = await DietPlan.find().select("-days");
        }

        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch diet plans" });
    }
});

// 🔍 Get specific plan details
router.get("/:id", auth, async (req, res) => {
    try {
        const plan = await DietPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ error: "Diet plan not found" });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: "Error fetching plan details" });
    }
});

// 🚀 Start a diet plan
router.post("/start", auth, async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.user.id || req.user._id;

        // Cancel any previous active diet
        await UserDiet.updateMany({ userId, status: "active" }, { status: "cancelled" });

        // Start new diet
        const newUserDiet = new UserDiet({
            userId,
            planId: planId,
            startDate: new Date(),
            status: "active",
            progress: 1
        });
        await newUserDiet.save();

        res.json({ message: "Diet journey started! 🥗", diet: newUserDiet });
    } catch (err) {
        res.status(500).json({ error: "Failed to start diet plan" });
    }
});

// 📊 Get active diet for dashboard
router.get("/me/active", auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const activeDiet = await UserDiet.findOne({ userId, status: "active" })
            .populate("planId");

        if (!activeDiet) return res.json(null);

        // Calculate current day based on startDate
        const diffTime = Math.abs(new Date() - new Date(activeDiet.startDate));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Cap at 10 days
        const currentDay = Math.min(diffDays, 10);

        // Update progress in DB if changed
        if (activeDiet.progress !== currentDay) {
            activeDiet.progress = currentDay;
            if (currentDay > 10) activeDiet.status = "completed";
            await activeDiet.save();
        }

        res.json(activeDiet);
    } catch (err) {
        res.status(500).json({ error: "Error fetching active diet" });
    }
});

// 🤖 AI Diet Suggestion Logic
router.post("/ai-suggest", auth, async (req, res) => {
    try {
        const { query } = req.body;
        const plans = await DietPlan.find().select("name description category");

        const prompt = `
You are a Senior Clinical Nutritionist. A user is asking for a diet plan recommendation.
Query: "${query}"

Available Diet Plans in our system:
${plans.map(p => `- ID: ${p._id}, Name: ${p.name}, Description: ${p.description}`).join("\n")}

Based on the user's query, select the MOST appropriate diet plan from the list above.
If multiple are relevant, pick the best one. 
Return ONLY the JSON with the selected Plan ID and a short reason why.

JSON Format:
{
  "selectedId": "PLAN_ID",
  "reason": "Why this is best for the user in 1 short sentence."
}
`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const aiChoice = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (aiChoice) {
            const fullPlan = await DietPlan.findById(aiChoice.selectedId);
            res.json({ suggestion: fullPlan, reason: aiChoice.reason });
        } else {
            res.status(404).json({ error: "AI couldn't find a matching plan." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "AI suggestion failed" });
    }
});

export default router;
