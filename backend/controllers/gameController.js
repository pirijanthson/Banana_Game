
const GameSession = require("../models/GameSession");
const User = require("../models/User");
const mongoose = require("mongoose");
const { fetchBananaPuzzle } = require("../services/bananaApiService");

const difficultySettings = {
  EASY: {
    lives: 5,
    totalQuestions: 10,
    questionTimeLimitSeconds: 60,
    pointsPerQuestion: 10,
  },
  MEDIUM: {
    lives: 3,
    totalQuestions: 10,
    questionTimeLimitSeconds: 45,
    pointsPerQuestion: 20,
  },
  HARD: {
    lives: 2,
    totalQuestions: 10,
    questionTimeLimitSeconds: 30,
    pointsPerQuestion: 30,
  },
};

async function updateUserStats(userId, gameSession, isCompleted) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const pointsEarned = gameSession.score;
    const newTotalPoints = (user.points || 0) + pointsEarned;

    let newStreak = user.currentStreak || 0;
    if (isCompleted) {
      newStreak += 1;
    } else {
      newStreak = 0;
    }

    user.points = newTotalPoints;
    user.currentStreak = newStreak;
    await user.save();
  } catch (error) {
    console.error("Update User Stats Error:", error.message);
  }
}

function formatGameForClient(gameSession) {
  return {
    id: gameSession._id.toString(),
    difficulty: gameSession.difficulty,
    score: gameSession.score,
    lives: gameSession.lives,
    totalQuestions: gameSession.totalQuestions,
    questionsAnswered: gameSession.questionsAnswered,
    correctAnswers: gameSession.correctAnswers,
    questionTimeLimitSeconds: gameSession.questionTimeLimitSeconds,
    questionStartedAt: gameSession.questionStartedAt,
    status: gameSession.status,
    question: gameSession.currentQuestionImage,
    startedAt: gameSession.startedAt,
    endedAt: gameSession.endedAt,
  };
}

// START GAME
const startGame = async (req, res) => {
  try {
    const difficulty = req.body?.difficulty?.toUpperCase();

    if (!difficultySettings[difficulty]) {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty. Choose EASY, MEDIUM, or HARD.",
      });
    }

    const activeGame = await GameSession.findOne({
      userId: req.user.userId,
      status: "ACTIVE",
    }).sort({ startedAt: -1 });

    if (activeGame) {
      return res.status(200).json({
        success: true,
        message: "Your active game has been resumed.",
        game: formatGameForClient(activeGame),
      });
    }

    const puzzle = await fetchBananaPuzzle();
    const settings = difficultySettings[difficulty];

    const gameSession = await GameSession.create({
      userId: req.user.userId,
      difficulty,
      lives: settings.lives,
      totalQuestions: settings.totalQuestions,
      questionTimeLimitSeconds: settings.questionTimeLimitSeconds,
      questionStartedAt: new Date(),
      currentQuestionImage: puzzle.question,
      currentAnswer: puzzle.solution,
    });

    return res.status(201).json({
      success: true,
      message: "Game started successfully.",
      game: formatGameForClient(gameSession),
    });
  } catch (error) {
    console.error("Start Game Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to start the game. Please try again.",
    });
  }
};

// GET ACTIVE GAME
const getActiveGame = async (req, res) => {
  try {
    const filter = {
      userId: req.user.userId,
      status: "ACTIVE",
    };

    if (req.params.gameId) {
      if (!mongoose.Types.ObjectId.isValid(req.params.gameId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid game session ID.",
        });
      }
      filter._id = new mongoose.Types.ObjectId(req.params.gameId);
    }

    const gameSession = await GameSession.findOne(filter).sort({ startedAt: -1 });

    if (req.params.gameId && !gameSession) {
      return res.status(404).json({
        success: false,
        message: "This game is no longer active.",
      });
    }

    return res.status(200).json({
      success: true,
      message: gameSession
        ? "Active game retrieved successfully."
        : "No active game was found.",
      game: gameSession ? formatGameForClient(gameSession) : null,
    });
  } catch (error) {
    console.error("Get Active Game Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your active game.",
    });
  }
};

// SUBMIT ANSWER
const submitAnswer = async (req, res) => {
  try {
    const { answer, gameId } = req.body;

    if (
      gameId !== undefined &&
      (typeof gameId !== "string" || !mongoose.Types.ObjectId.isValid(gameId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid game session ID.",
      });
    }

    if (
      answer !== undefined &&
      answer !== null &&
      typeof answer !== "string" &&
      typeof answer !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "Answer must be text or a number.",
      });
    }

    const filter = {
      userId: req.user.userId,
      status: "ACTIVE",
    };
    if (gameId) {
      filter._id = new mongoose.Types.ObjectId(gameId);
    }

    const gameSession = await GameSession.findOne(filter)
      .sort({ startedAt: -1 })
      .select("+currentAnswer");

    if (!gameSession) {
      return res.status(404).json({
        success: false,
        message: "No active game session was found for this account.",
      });
    }

    const elapsedTime =
      (Date.now() - new Date(gameSession.questionStartedAt).getTime()) / 1000;

    const timeExpired =
      elapsedTime >= gameSession.questionTimeLimitSeconds;

    if (
      !timeExpired &&
      (answer === undefined ||
        answer === null ||
        String(answer).trim() === "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Please submit your answer.",
      });
    }

    const isCorrect =
      !timeExpired &&
      String(answer).trim().toLowerCase() ===
        String(gameSession.currentAnswer).trim().toLowerCase();

    let result;

    if (timeExpired) {
      gameSession.lives -= 1;
      result = "TIME_EXPIRED";
    } else if (isCorrect) {
      const settings = difficultySettings[gameSession.difficulty];

      gameSession.score += settings.pointsPerQuestion;
      gameSession.correctAnswers += 1;
      result = "CORRECT";
    } else {
      gameSession.lives -= 1;
      result = "WRONG";
    }

    gameSession.questionsAnswered += 1;

    // CHECK GAME END CONDITIONS
    if (gameSession.lives <= 0) {
      gameSession.lives = 0;
      gameSession.status = "FAILED";
      gameSession.endedAt = new Date();
      gameSession.currentAnswer = null;
      gameSession.currentQuestionImage = null;

      await gameSession.save();
      await updateUserStats(req.user.userId, gameSession, false);

      return res.status(200).json({
        success: true,
        message: "Game over. You have no remaining lives.",
        result,
        game: formatGameForClient(gameSession),
      });
    }

    if (gameSession.questionsAnswered >= gameSession.totalQuestions) {
      gameSession.status = "COMPLETED";
      gameSession.endedAt = new Date();
      gameSession.currentAnswer = null;
      gameSession.currentQuestionImage = null;

      await gameSession.save();
      await updateUserStats(req.user.userId, gameSession, true);

      return res.status(200).json({
        success: true,
        message: "Congratulations! You completed the game.",
        result,
        game: formatGameForClient(gameSession),
      });
    }

    // FETCH NEXT QUESTION
    const nextPuzzle = await fetchBananaPuzzle();

    gameSession.currentQuestionImage = nextPuzzle.question;
    gameSession.currentAnswer = nextPuzzle.solution;
    gameSession.questionStartedAt = new Date();

    await gameSession.save();

    return res.status(200).json({
      success: true,
      message: "Next question loaded successfully.",
      result,
      game: formatGameForClient(gameSession),
    });
  } catch (error) {
    console.error("Submit Answer Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to submit answer. Please try again.",
    });
  }
};

// GET GAME HISTORY
const getGameHistory = async (req, res) => {
  try {
    const games = await GameSession.find({
      userId: req.user.userId,
    })
      .select(
        "difficulty score lives totalQuestions questionsAnswered correctAnswers status startedAt endedAt createdAt"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Game history retrieved successfully.",
      totalGames: games.length,
      games,
    });
  } catch (error) {
    console.error("Get Game History Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve game history.",
    });
  }
};

// GET SCORE SUMMARY
const getScoreSummary = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const summary = await GameSession.aggregate([
      {
        $match: {
          userId,
        },
      },
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          completedGames: {
            $sum: {
              $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0],
            },
          },
          failedGames: {
            $sum: {
              $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
            },
          },
          highestScore: { $max: "$score" },
          totalPoints: { $sum: "$score" },
          averageScore: { $avg: "$score" },
        },
      },
    ]);

    const result = summary[0] || {
      totalGames: 0,
      completedGames: 0,
      failedGames: 0,
      highestScore: 0,
      totalPoints: 0,
      averageScore: 0,
    };

    return res.status(200).json({
      success: true,
      message: "Score summary retrieved successfully.",
      scores: {
        totalGames: result.totalGames,
        completedGames: result.completedGames,
        failedGames: result.failedGames,
        highestScore: result.highestScore,
        totalPoints: result.totalPoints,
        averageScore: Number((result.averageScore || 0).toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Get Score Summary Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve score summary.",
    });
  }
};


const getScoreStatistics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const statistics = await GameSession.aggregate([
      {
        $match: { userId },
      },
      {
        $group: {
          _id: null,
          totalQuestionsAnswered: {
            $sum: "$questionsAnswered",
          },
          totalCorrectAnswers: {
            $sum: "$correctAnswers",
          },
          totalPointsEarned: {
            $sum: "$score",
          },
        },
      },
    ]);

    const result = statistics[0] || {
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalPointsEarned: 0,
    };

    const totalIncorrectAnswers =
      result.totalQuestionsAnswered - result.totalCorrectAnswers;

    const accuracyPercentage =
      result.totalQuestionsAnswered > 0
        ? Number(
            (
              (result.totalCorrectAnswers /
                result.totalQuestionsAnswered) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      message: "Score statistics retrieved successfully.",
      statistics: {
        totalQuestionsAnswered: result.totalQuestionsAnswered,
        totalCorrectAnswers: result.totalCorrectAnswers,
        totalIncorrectAnswers,
        totalPointsEarned: result.totalPointsEarned,
        accuracyPercentage,
      },
    });
  } catch (error) {
    console.error("Get Score Statistics Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve score statistics.",
    });
  }
};


const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await GameSession.aggregate([
      {
        $match: {
          status: "COMPLETED",
        },
      },
      {
        $group: {
          _id: "$userId",
          totalPoints: { $sum: "$score" },
          highestScore: { $max: "$score" },
          totalGames: { $sum: 1 },
        },
      },
      {
        $sort: {
          totalPoints: -1,
          highestScore: -1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          username: "$user.username",
          totalPoints: 1,
          highestScore: 1,
          totalGames: 1,
        },
      },
    ]);

    const rankedLeaderboard = leaderboard.map((player, index) => ({
      rank: index + 1,
      ...player,
    }));

    return res.status(200).json({
      success: true,
      message: "Leaderboard retrieved successfully.",
      leaderboard: rankedLeaderboard,
    });
  } catch (error) {
    console.error("Get Leaderboard Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve leaderboard.",
    });
  }
};

const getMyLeaderboardRank = async (req, res) => {
  try {
    const leaderboard = await GameSession.aggregate([
      {
        $match: {
          status: "COMPLETED",
        },
      },
      {
        $group: {
          _id: "$userId",
          totalPoints: { $sum: "$score" },
          highestScore: { $max: "$score" },
          totalGames: { $sum: 1 },
        },
      },
      {
        $sort: {
          totalPoints: -1,
          highestScore: -1,
        },
      },
    ]);

    const myRank = leaderboard.findIndex(
      (player) => player._id.toString() === req.user.userId.toString()
    );

    if (myRank === -1) {
      return res.status(200).json({
        success: true,
        message: "You are not ranked yet. Complete a game first.",
        leaderboard: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Your leaderboard rank retrieved successfully.",
      leaderboard: {
        rank: myRank + 1,
        totalPoints: leaderboard[myRank].totalPoints,
        highestScore: leaderboard[myRank].highestScore,
        totalGames: leaderboard[myRank].totalGames,
      },
    });
  } catch (error) {
    console.error("Get My Leaderboard Rank Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your leaderboard rank.",
    });
  }
};


module.exports = {
  startGame,
  getActiveGame,
  submitAnswer,
  getGameHistory,
  getScoreSummary,
  getScoreStatistics,
  getLeaderboard,
  getMyLeaderboardRank,
};
