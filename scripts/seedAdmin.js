require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@quiz.com" });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    // Create admin
    const admin = await Admin.create({
      username: "admin",
      email: "admin@quiz.com",
      password: "admin123", // Change this password!
    });

    console.log("Admin created successfully");
    console.log("Email:", admin.email);
    console.log("Password: admin123");
    console.log("⚠️  IMPORTANT: Change this password after first login!");

    process.exit();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

seedAdmin();
