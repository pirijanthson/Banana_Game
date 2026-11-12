const express = require("express");

const router = express.Router();

const { getUserSettings,
        updateUserSettings,
        updateUserProfile,
        changePassword
 } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/settings", protect, getUserSettings);
router.put("/settings", protect, updateUserSettings);
router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);
module.exports = router;
