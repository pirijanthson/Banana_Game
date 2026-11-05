const express = require("express");
const router = express.Router();

const { startGame,
        submitAnswer,
        getGameHistory
 } = require("../controllers/gameController");
 
const { protect } = require("../middleware/authMiddleware");

router.post("/start", protect, startGame);
router.post("/:sessionId/answer", protect, submitAnswer);
router.get("/history", protect, getGameHistory);

module.exports = router;
