const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      required: true,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    lives: {
      type: Number,
      required: true,
      min: 0,
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },

    questionsAnswered: {
      type: Number,
      default: 0,
      min: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentQuestionImage: {
      type: String,
      default: null,
    },

    currentAnswer: {
      type: String,
      default: null,
      select: false,
    },

    questionTimeLimitSeconds: {
    type: Number,
    required: true,
    min: 1,
    },

    questionStartedAt: {
    type: Date,
    default: Date.now,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "FAILED"],
      default: "ACTIVE",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GameSession", gameSessionSchema);
