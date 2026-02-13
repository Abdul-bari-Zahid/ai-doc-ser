import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const authmiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];  // <- split by space

  if (!token) {
    console.log("Headers:", req.headers);
    console.log("Token:", req.headers.authorization);

    return res.status(401).json({ message: "Unauthorized - No Token" });

  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};
export default authmiddleware

