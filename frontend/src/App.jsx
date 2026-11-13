import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Dashboard from "./pages/Dashboard/Dashboard";
import GameSelection from "./pages/GameSelection/GameSelection";
import Gameplay from "./pages/Gameplay/Gameplay";
import GameResult from "./pages/GameResult/GameResult";
import GameHistory from "./pages/GameHistory/GameHistory";
import ScoreSummary from "./pages/ScoreSummary/ScoreSummary";
import ScoreStatistics from "./pages/ScoreStatistics/ScoreStatistics";
import Leaderboard from "./pages/Leaderboard/Leaderboard";
import Profile from "./pages/Profile/Profile";
import ChangePassword from "./pages/ChangePassword/ChangePassword";
import Settings from "./pages/Settings/Settings";
import { AppSettingsProvider } from "./context/AppSettingsProvider";

function App() {
  return (
    <AppSettingsProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />

        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/game-selection" element={<GameSelection />} />
        <Route path="/gameplay" element={<Gameplay />} />
        <Route path="/game-result" element={<GameResult />} />

        <Route path="/game-history" element={<GameHistory />} />
        <Route path="/score-summary" element={<ScoreSummary />} />
        <Route path="/score-statistics" element={<ScoreStatistics />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/my-rank" element={<Navigate to="/leaderboard" replace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/settings" element={<Settings />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppSettingsProvider>
  );
}

export default App;
