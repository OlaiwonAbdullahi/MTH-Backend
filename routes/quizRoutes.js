const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  getQuizQuestions,
  getQuizQuestion,
  submitQuiz,
  getCategories,
  getStatistics,
  getLeaderboard,
  startQuiz,
  getSession,
} = require("../controllers/quizController");

// Rate limiting for quiz endpoints
const quizLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
});

router.use(quizLimiter);

router.get("/questions", getQuizQuestions);
router.get("/questions/:id", getQuizQuestion);
router.post("/submit", submitQuiz);
router.get("/categories", getCategories);
router.get("/statistics", getStatistics);
router.get("/leaderboard", getLeaderboard);
router.post("/start", startQuiz);
router.get("/session/:sessionId", getSession);

module.exports = router;
