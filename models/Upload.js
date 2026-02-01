const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["pdf", "docx", "txt", "json"],
      required: true,
    },
    fileSize: Number,
    filePath: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    extractedQuestions: {
      type: Number,
      default: 0,
    },
    errorMessage: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Upload", uploadSchema);
