const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    getUserProfile,
    forgotPassword,
    resetPassword,
    logoutUser,
    googleLogin
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getUserProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/logout", protect, logoutUser);
router.post("/google-login", googleLogin);

module.exports = router;
