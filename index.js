require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const quizRoutes = require("./routes/quizRoutes");
const swaggerUi = require("swagger-ui-express");

const app = express();
function loadSwaggerSpec() {
  try {
    const spec = require("./swaggerConfig");
    if (spec && Object.keys(spec).length) return spec;
  } catch (err) {
    console.warn("Could not load ./swaggerConfig:", err.message);
  }

  try {
    const staticSpec = require("./swagger-output.json");
    if (staticSpec && Object.keys(staticSpec).length) return staticSpec;
  } catch (err) {
    console.warn("Could not load ./swagger-output.json:", err.message);
  }
  return {
    openapi: "3.0.0",
    info: {
      title: "MTH Backend API (minimal fallback)",
      version: "0.0.0",
      description:
        "Fallback OpenAPI spec — the real spec could not be loaded in this environment.",
    },
    paths: {},
  };
}

const swaggerSpec = loadSwaggerSpec();
(async () => {
  try {
    await connectDB();
    console.log("MongoDB connected");
  } catch (err) {
    console.error(
      "MongoDB connection error (continuing without DB):",
      err.message
    );
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/quiz", quizRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Welcome Boss" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
