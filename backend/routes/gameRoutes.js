const express = require("express");
const router = express.Router();

const { startGame,
        submitAnswer,
        getGameHistory,
        getScoreSummary,
        getScoreStatistics,
        getLeaderboard,
        getMyLeaderboardRank
 } = require("../controllers/gameController");

const { protect } = require("../middleware/authMiddleware");

router.post("/start", protect, startGame);
router.post("/answer", protect, submitAnswer);
router.get("/history", protect, getGameHistory);
router.get("/scores/summary", protect, getScoreSummary);
router.get("/scores/statistics", protect, getScoreStatistics);
router.get("/leaderboard", protect, getLeaderboard);
router.get("/rank", protect, getMyLeaderboardRank);

module.exports = router;
