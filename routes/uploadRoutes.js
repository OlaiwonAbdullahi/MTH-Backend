const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const {
  uploadDocument,
  getUploadDetails,
  approveQuestions,
  getUploads,
} = require("../controllers/uploadController");

// All routes require authentication
router.use(protect);

router.post("/upload", upload.single("file"), uploadDocument);
router.get("/uploads", getUploads);
router.get("/uploads/:uploadId", getUploadDetails);
router.post("/uploads/:uploadId/approve", approveQuestions);

module.exports = router;
