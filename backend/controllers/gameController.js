const GameSession = require("../models/GameSession");
const { fetchBananaPuzzle } = require("../services/bananaApiService");

const difficultySettings = {
  EASY: {
    lives: 5,
    totalQuestions: 5,
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
    totalQuestions: 15,
    questionTimeLimitSeconds: 30,
    pointsPerQuestion: 30,
  },
};

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
      game: {
        sessionId: gameSession._id,
        difficulty: gameSession.difficulty,
        score: gameSession.score,
        lives: gameSession.lives,
        totalQuestions: gameSession.totalQuestions,
        questionsAnswered: gameSession.questionsAnswered,
        questionTimeLimitSeconds:
          gameSession.questionTimeLimitSeconds,
        questionStartedAt: gameSession.questionStartedAt,
        status: gameSession.status,
        question: gameSession.currentQuestionImage,
      },
    });
  } catch (error) {
    console.error("Start Game Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to start the game. Please try again.",
    });
  }
};

// SUBMIT ANSWER
const submitAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    if (answer !== undefined && answer !== null &&
        typeof answer !== "string" && typeof answer !== "number") {
      return res.status(400).json({
        success: false,
        message: "Answer must be text or a number.",
      });
    }

    const gameSession = await GameSession.findOne({
      _id: sessionId,
      userId: req.user.userId,
    }).select("+currentAnswer");

    if (!gameSession) {
      return res.status(404).json({
        success: false,
        message: "Game session not found.",
      });
    }

    if (gameSession.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "This game session is no longer active.",
      });
    }

    // CHECK QUESTION TIME
    const elapsedTime =
      (Date.now() - new Date(gameSession.questionStartedAt).getTime()) / 1000;

    const timeExpired =
      elapsedTime >= gameSession.questionTimeLimitSeconds;

    if (!timeExpired && (answer === undefined || answer === null || String(answer).trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "Please submit your answer.",
      });
    }

    // CHECK ANSWER
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

    // UPDATE QUESTION PROGRESS
    gameSession.questionsAnswered += 1;

    // CHECK GAME END CONDITIONS
    if (gameSession.lives <= 0) {
      gameSession.lives = 0;
      gameSession.status = "FAILED";
      gameSession.endedAt = new Date();
      gameSession.currentAnswer = null;
      gameSession.currentQuestionImage = null;

      await gameSession.save();

      return res.status(200).json({
        success: true,
        message: "Game over. You have no remaining lives.",
        result,
        game: {
          score: gameSession.score,
          lives: gameSession.lives,
          questionsAnswered: gameSession.questionsAnswered,
          totalQuestions: gameSession.totalQuestions,
          correctAnswers: gameSession.correctAnswers,
          status: gameSession.status,
        },
      });
    }

    if (gameSession.questionsAnswered >= gameSession.totalQuestions) {
      gameSession.status = "COMPLETED";
      gameSession.endedAt = new Date();
      gameSession.currentAnswer = null;
      gameSession.currentQuestionImage = null;

      await gameSession.save();

      return res.status(200).json({
        success: true,
        message: "Congratulations! You completed the game.",
        result,
        game: {
          score: gameSession.score,
          lives: gameSession.lives,
          questionsAnswered: gameSession.questionsAnswered,
          totalQuestions: gameSession.totalQuestions,
          correctAnswers: gameSession.correctAnswers,
          status: gameSession.status,
        },
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
      game: {
        sessionId: gameSession._id,
        difficulty: gameSession.difficulty,
        score: gameSession.score,
        lives: gameSession.lives,
        questionsAnswered: gameSession.questionsAnswered,
        totalQuestions: gameSession.totalQuestions,
        questionTimeLimitSeconds:
          gameSession.questionTimeLimitSeconds,
        questionStartedAt: gameSession.questionStartedAt,
        status: gameSession.status,
        question: gameSession.currentQuestionImage,
      },
    });
  } catch (error) {
    console.error("Submit Answer Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to submit answer. Please try again.",
    });
  }
};


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


module.exports = {
  startGame,
  submitAnswer,
  getGameHistory,
};
