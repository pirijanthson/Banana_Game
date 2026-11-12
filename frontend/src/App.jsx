import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Dashboard from "./pages/Dashboard/Dashboard";
import GameSelection from "./pages/GameSelection/GameSelection";
import Gameplay from "./pages/Gameplay/Gameplay";
import GameResult from "./pages/GameResult/GameResult";
import GameHistory from "./pages/GameHistory/GameHistory";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

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
      <Route path="/score-summary" element={<div>Score Summary Page</div>} />
      <Route path="/score-statistics" element={<div>Score Statistics Page</div>} />
      <Route path="/leaderboard" element={<div>Leaderboard Page</div>} />
      <Route path="/my-rank" element={<div>My Rank Page</div>} />
      <Route path="/profile" element={<div>Profile Page</div>} />
      <Route path="/change-password" element={<div>Change Password Page</div>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
