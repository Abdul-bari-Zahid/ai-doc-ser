

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import vital from "./routes/vital.js";
dotenv.config();
const app = express();

app.use(cors({ origin: ["http://localhost:5173", "https://ai-doc-client.vercel.app/"], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/vitals", vital);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(process.env.PORT, () => console.log(`🚀 Server running on ${process.env.PORT}`));
  })
  .catch((err) => console.log("MongoDB Error:", err));
