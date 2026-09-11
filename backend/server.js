const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

// ===============================
// ROUTES
// ===============================

const authRoutes = require("./routes/authRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const sensorRoutes = require("./routes/sensorRoutes");

// ===============================
// EXPRESS APP
// ===============================

const app = express();

// ===============================
// CORS
// ===============================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://class-room-automation.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin
      // Example: Postman, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked:", origin);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "HEAD",
      "PUT",
      "PATCH",
      "POST",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ===============================
// BODY PARSER
// ===============================

app.use(express.json());

// ===============================
// MONGODB CONNECTION
// ===============================

const connectDB = async () => {
  // Check environment variable
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI environment variable is missing"
    );
  }

  // Already connected
  if (mongoose.connection.readyState === 1) {
    console.log("✅ MongoDB already connected");
    return;
  }

  // Connection is currently being established
  if (mongoose.connection.readyState === 2) {
    console.log("⏳ MongoDB connection is already in progress");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error(
      "❌ MongoDB connection error:",
      error.message
    );

    throw error;
  }
};

// ===============================
// MONGODB EVENTS
// ===============================

mongoose.connection.on("connected", () => {
  console.log("🟢 Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (error) => {
  console.error(
    "🔴 Mongoose connection error:",
    error.message
  );
});

mongoose.connection.on("disconnected", () => {
  console.log("🟡 Mongoose disconnected from MongoDB");
});

// ===============================
// AUTH ROUTES
// ===============================

app.use(
  "/api/auth",
  async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error(
        "Auth DB Error:",
        error.message
      );

      res.status(500).json({
        message: "Database connection failed",
        error: error.message,
      });
    }
  },
  authRoutes
);

// ===============================
// DEVICE ROUTES
// ===============================

app.use(
  "/api/devices",
  async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error(
        "Device DB Error:",
        error.message
      );

      res.status(500).json({
        message: "Database connection failed",
        error: error.message,
      });
    }
  },
  deviceRoutes
);

// ===============================
// SENSOR ROUTES
// ===============================

app.use(
  "/api/sensors",
  async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error(
        "Sensor DB Error:",
        error.message
      );

      res.status(500).json({
        message: "Database connection failed",
        error: error.message,
      });
    }
  },
  sensorRoutes
);

// ===============================
// HEALTH CHECK
// ===============================

app.get("/", async (req, res) => {
  try {
    await connectDB();

    res.status(200).json({
      message:
        "Classroom Automation API is running 🚀",
      database: "MongoDB connected",
      status: "OK",
    });
  } catch (error) {
    console.error(
      "Health Check Error:",
      error.message
    );

    res.status(500).json({
      message: "Classroom Automation API",
      database: "MongoDB connection failed",
      status: "ERROR",
      error: error.message,
    });
  }
});

// ===============================
// 404 HANDLER
// ===============================

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);

  res.status(500).json({
    message: "Internal server error",
    error: err.message,
  });
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
        console.log(
          `🚀 Server running on http://localhost:${PORT}`
        );
      });
    })
    .catch((error) => {
      console.error(
        "❌ Server startup failed:",
        error.message
      );

      process.exit(1);
    });
}