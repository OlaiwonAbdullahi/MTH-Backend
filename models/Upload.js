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
      enum: ["pdf", "docx", "txt", "json", "csv"],
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
      enum: ["processing", "completed", "failed", "approved", "rejected"],
      default: "processing",
    },
    extractionMethod: {
      type: String,
      enum: ["ai", "pattern", "json", "csv"],
    },
    extractedQuestions: {
      type: Number,
      default: 0,
    },
    skippedBlocks: {
      type: Number,
      default: 0,
    },
    // Persisted preview of extracted questions so an admin can come back
    // and review/edit before approving, instead of only seeing them in
    // the immediate upload response.
    questions: {
      type: [mongoose.Schema.Types.Mixed],
      default: undefined,
    },
    errorMessage: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Upload", uploadSchema);
