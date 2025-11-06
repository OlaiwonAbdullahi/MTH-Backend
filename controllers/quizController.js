const Question = require("../models/Question");
const QuizSession = require("../models/QuizSession");
const crypto = require("crypto");

// @desc    Get random quiz questions
// @route   GET /api/quiz/questions
// @access  Public
exports.getQuizQuestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const difficulty = req.query.difficulty;

    const query = { isActive: true };
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: limit } },
      { $project: { correctAnswer: 0, explanation: 0 } },
    ]);

    res.json({
      success: true,
      count: questions.length,
      data: questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get a specific question (without answer)
// @route   GET /api/quiz/questions/:id
// @access  Public
exports.getQuizQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).select(
      "-correctAnswer -explanation"
    );

    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Submit quiz and get score
// @route   POST /api/quiz/submit
// @access  Public
exports.submitQuiz = async (req, res) => {
  try {
    const { answers, userName, sessionId } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide answers array",
      });
    }

    let totalScore = 0;
    let maxScore = 0;
    const results = [];

    for (const answer of answers) {
      const question = await Question.findById(answer.questionId);

      if (!question) continue;

      const isCorrect = question.correctAnswer === answer.userAnswer;
      const pointsEarned = isCorrect ? question.points : 0;

      totalScore += pointsEarned;
      maxScore += question.points;

      results.push({
        questionId: question._id,
        question: question.question,
        userAnswer: answer.userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: pointsEarned,
        explanation: question.explanation,
      });
    }

    // Save session if provided
    if (sessionId || userName) {
      const session = new QuizSession({
        sessionId: sessionId || crypto.randomBytes(16).toString("hex"),
        userName: userName || "Anonymous",
        questions: results.map((r) => ({
          questionId: r.questionId,
          userAnswer: r.userAnswer,
          isCorrect: r.isCorrect,
          points: r.points,
        })),
        totalScore,
        maxScore,
        status: "completed",
        completedAt: new Date(),
      });

      await session.save();
    }

    res.json({
      success: true,
      totalScore,
      maxScore,
      percentage: maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(2) : 0,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get available categories
// @route   GET /api/quiz/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Question.distinct("category", { isActive: true });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get quiz statistics
// @route   GET /api/quiz/statistics
// @access  Public
exports.getStatistics = async (req, res) => {
  try {
    const totalQuestions = await Question.countDocuments({ isActive: true });
    const categories = await Question.distinct("category", { isActive: true });

    const difficultyCounts = await Question.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    ]);

    const categoryCounts = await Question.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalQuestions,
        totalCategories: categories.length,
        categories: categoryCounts.map((c) => ({
          category: c._id,
          count: c.count,
        })),
        difficulty: difficultyCounts.map((d) => ({
          level: d._id,
          count: d.count,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get leaderboard
// @route   GET /api/quiz/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = await QuizSession.find({ status: "completed" })
      .sort({ totalScore: -1, completedAt: 1 })
      .limit(limit)
      .select("userName totalScore maxScore completedAt");

    res.json({
      success: true,
      data: leaderboard.map((session, index) => ({
        rank: index + 1,
        userName: session.userName,
        score: session.totalScore,
        maxScore: session.maxScore,
        percentage: ((session.totalScore / session.maxScore) * 100).toFixed(2),
        completedAt: session.completedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Start a quiz session
// @route   POST /api/quiz/start
// @access  Public
exports.startQuiz = async (req, res) => {
  try {
    const { userName, limit, category, difficulty } = req.body;

    const query = { isActive: true };
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    const questionLimit = parseInt(limit) || 10;
    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: questionLimit } },
    ]);

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found matching criteria",
      });
    }

    const sessionId = crypto.randomBytes(16).toString("hex");

    const session = new QuizSession({
      sessionId,
      userName: userName || "Anonymous",
      questions: questions.map((q) => ({
        questionId: q._id,
        userAnswer: null,
        isCorrect: null,
        points: 0,
      })),
      maxScore: questions.reduce((sum, q) => sum + q.points, 0),
    });

    await session.save();

    res.json({
      success: true,
      sessionId,
      questions: questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        category: q.category,
        difficulty: q.difficulty,
        points: q.points,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get quiz session details
// @route   GET /api/quiz/session/:sessionId
// @access  Public
exports.getSession = async (req, res) => {
  try {
    const session = await QuizSession.findOne({
      sessionId: req.params.sessionId,
    }).populate("questions.questionId", "question options");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
