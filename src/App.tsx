import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { FullSpinner } from "./components/ui";
import SignIn from "./screens/SignIn";
import CheckEmail from "./screens/CheckEmail";
import SetName from "./screens/SetName";
import Home from "./screens/Home";
import NewRound from "./screens/NewRound";
import ScoreEntry from "./screens/ScoreEntry";
import Summary from "./screens/Summary";
import Stats from "./screens/Stats";
import Account from "./screens/Account";

export default function App() {
  const { loading, session, profile } = useAuth();

  let content;

  if (loading) {
    content = (
      <div className="screen">
        <FullSpinner label="Loading…" />
      </div>
    );
  } else if (!session) {
    // Signed out: only the auth screens are reachable.
    content = (
      <Routes>
        <Route path="/login" element={<SignIn />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  } else if (!profile) {
    // Signed in but no display name yet: force onboarding.
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <div className="app">{content}</div>;
}
