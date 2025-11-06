const mongoose = require("mongoose");

const quizSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
        userAnswer: Number,
        isCorrect: Boolean,
        points: Number,
      },
    ],
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },
  },
  {
    timestamps: true,
  }
);

// Index for leaderboard queries
quizSessionSchema.index({ totalScore: -1, completedAt: -1 });

module.exports = mongoose.model("QuizSession", quizSessionSchema);
