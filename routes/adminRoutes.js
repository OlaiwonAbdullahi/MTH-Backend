const express = require("express");
const router = express.Router();
const {
  createQuestion,
  getAllQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  bulkCreateQuestions,
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");

// Apply protection middleware to all admin routes
router.use(protect);

router.route("/questions").post(createQuestion).get(getAllQuestions);

router.post("/questions/bulk", bulkCreateQuestions);

router
  .route("/questions/:id")
  .get(getQuestion)
  .put(updateQuestion)
  .delete(deleteQuestion);

module.exports = router;
