const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, "Options are required"],
      validate: {
        validator: function (arr) {
          return arr.length >= 2 && arr.length <= 6;
        },
        message: "Must have between 2 and 6 options",
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, "Correct answer index is required"],
      validate: {
        validator: function (val) {
          return val >= 0 && val < this.options.length;
        },
        message: "Correct answer must be a valid option index",
      },
    },
    course: {
      type: String,
      required: [true, "course is required"],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    points: {
      type: Number,
      default: 10,
    },
    explanation: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
questionSchema.index({ course: 1, difficulty: 1, isActive: 1 });

module.exports = mongoose.model("Question", questionSchema);
