const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  refreshToken,
  verify,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", login);
router.post("/logout", protect, logout);
router.post("/refresh", refreshToken);
router.get("/verify", protect, verify);

module.exports = router;
