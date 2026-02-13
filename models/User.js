import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    language: { type: String, default: "English" },
    country: { type: String, default: "Pakistan" },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
