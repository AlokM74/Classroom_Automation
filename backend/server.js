const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const sensorRoutes = require("./routes/sensorRoutes");

const app = express();

// ===============================
// CORS
// ===============================

const allowedOrigins = [
  "http://localhost:5173",
  "https://class-room-automation.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  })
);

// ===============================
// BODY PARSER
// ===============================

app.use(express.json());

// ===============================
// MONGODB CONNECTION
// ===============================

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing");
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    isConnected = true;

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

// ===============================
// ROUTES
// ===============================

app.use("/api/auth", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
}, authRoutes);

app.use("/api/devices", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
}, deviceRoutes);

app.use("/api/sensors", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
}, sensorRoutes);

// ===============================
// HEALTH CHECK
// ===============================

app.get("/", async (req, res) => {
  try {
    await connectDB();

    res.json({
      message: "Classroom Automation API is running 🚀",
      database: "MongoDB connected",
    });
  } catch (error) {
    res.status(500).json({
      message: "Classroom Automation API",
      database: "MongoDB connection failed",
      error: error.message,
    });
  }
});

// ===============================
// EXPORT FOR VERCEL
// ===============================

module.exports = app;

// ===============================
// LOCAL DEVELOPMENT
// ===============================

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("❌ Server startup failed:", error.message);
      process.exit(1);
    });
}