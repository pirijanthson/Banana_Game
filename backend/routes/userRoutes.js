const express = require("express");

const router = express.Router();

const { updateUserProfile,
        changePassword
 } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);
module.exports = router;
