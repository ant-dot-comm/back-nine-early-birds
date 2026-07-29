import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { FullSpinner } from "./components/ui";
import SignIn from "./screens/SignIn";
import ResetPassword from "./screens/ResetPassword";
import SetName from "./screens/SetName";
import Home from "./screens/Home";
import NewRound from "./screens/NewRound";
import ScoreEntry from "./screens/ScoreEntry";
import Summary from "./screens/Summary";
import Stats from "./screens/Stats";
import Account from "./screens/Account";
import RareNames from "./screens/RareNames";
import PlayerProfile from "./screens/PlayerProfile";
import JoinInvite from "./screens/JoinInvite";

export default function App() {
  const { loading, profileLoading, session, profile, recovery } = useAuth();
  const location = useLocation();

  // Invite landing: reachable in any auth state (handles its own sign-up flow).
  if (location.pathname === "/join") {
    return (
      <div className="app">
        <JoinInvite />
      </div>
    );
  }

  let content;

  if (loading) {
    content = (
      <div className="screen">
        <FullSpinner label="Loading…" />
      </div>
    );
  } else if (recovery) {
    // Arrived via a password-reset link: force setting a new password first.
    content = (
      <Routes>
        <Route path="*" element={<ResetPassword />} />
      </Routes>
    );
  } else if (!session) {
    // Signed out: only the auth screen is reachable.
    content = (
      <Routes>
        <Route path="/login" element={<SignIn />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  } else if (!profile && profileLoading) {
    // Signed in, profile still loading: hold on a spinner (avoids an onboarding flash).
    content = (
      <div className="screen">
        <FullSpinner label="Loading…" />
      </div>
    );
  } else if (!profile) {
    // Signed in but genuinely no display name yet: force onboarding.
    content = (
      <Routes>
        <Route path="/welcome" element={<SetName />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    );
  } else {
    content = (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rounds/new" element={<NewRound />} />
        <Route path="/rounds/:id/score" element={<ScoreEntry />} />
        <Route path="/rounds/:id" element={<Summary />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/account" element={<Account />} />
        <Route path="/rare" element={<RareNames />} />
        <Route path="/player/:id" element={<PlayerProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <div className="app">{content}</div>;
}
