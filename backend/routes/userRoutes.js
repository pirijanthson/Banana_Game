const express = require("express");

const router = express.Router();

const {
        getUserProfile,
        getUserSettings,
        updateUserSettings,
        updateUserProfile,
        changePassword,
        uploadAvatar,
        getCookieConsent,
        updateCookieConsent
 } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/profile", protect, getUserProfile);
router.get("/settings", protect, getUserSettings);
router.put("/settings", protect, updateUserSettings);
router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);
router.post("/avatar", protect, uploadAvatar);
router.get("/cookie-consent", protect, getCookieConsent);
router.put("/cookie-consent", protect, updateCookieConsent);

module.exports = router;
