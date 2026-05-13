import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import dashboardRoutes from "./routes/dashboard.js";

dotenv.config();

const app = express();

app.use(express.json());

// FIXED: Added a fallback so it doesn't break if CLIENT_URL is missing on Render
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", 
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5002;

// FIXED: Added clear logging so Render tells you exactly what is missing
console.log("--- Checking Environment Variables ---");
console.log("JWT_SECRET Status:", process.env.JWT_SECRET ? "✅ Found" : "❌ Missing");
console.log("MONGO_URI Status:", process.env.MONGO_URI ? "✅ Found" : "❌ Missing");
console.log("CLIENT_URL Status:", process.env.CLIENT_URL ? "✅ Found" : "❌ Missing (CORS will allow all)");

if (!process.env.JWT_SECRET) {
  console.error("❌ CRASH: Server stopped because JWT_SECRET is missing. Add it in Render Dashboard -> Environment!");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("❌ CRASH: Server stopped because MONGO_URI is missing. Add it in Render Dashboard -> Environment!");
  process.exit(1);
}

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect DB. Check if your MONGO_URI is correct and MongoDB allows IP 0.0.0.0/0:", err);
    process.exit(1);
  });