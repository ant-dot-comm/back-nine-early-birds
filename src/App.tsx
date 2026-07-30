import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { FullSpinner } from "./components/ui";
import { Dock } from "./components/paint";
import SignIn from "./screens/SignIn";
import ResetPassword from "./screens/ResetPassword";
import SetName from "./screens/SetName";
import Home from "./screens/Home";
import RoundsArchive from "./screens/RoundsArchive";
import NewRound from "./screens/NewRound";
import ScoreEntry from "./screens/ScoreEntry";
import Summary from "./screens/Summary";
import Stats from "./screens/Stats";
import Account from "./screens/Account";
import Bag from "./screens/Bag";
import Me from "./screens/Me";
import PlayerProfile from "./screens/PlayerProfile";
import Duels from "./screens/Duels";
import Tournaments from "./screens/Tournaments";
import CreateTournament from "./screens/CreateTournament";
import TournamentDetail from "./screens/TournamentDetail";
import JoinInvite from "./screens/JoinInvite";

// Top-level tab routes that carry the floating dock.
const DOCK_PATHS = ["/", "/rounds", "/stats", "/bag", "/me"];

export default function App() {
  const { loading, profileLoading, session, profile, recovery } = useAuth();
  const location = useLocation();

  if (location.pathname === "/join") {
    return <div className="app"><JoinInvite /></div>;
  }

  let content;
  let showDock = false;

  if (loading) {
    content = <div className="screen"><FullSpinner label="Loading…" /></div>;
  } else if (recovery) {
    content = <Routes><Route path="*" element={<ResetPassword />} /></Routes>;
  } else if (!session) {
    content = (
      <Routes>
        <Route path="/login" element={<SignIn />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  } else if (!profile && profileLoading) {
    content = <div className="screen"><FullSpinner label="Loading…" /></div>;
  } else if (!profile) {
    content = (
      <Routes>
        <Route path="/welcome" element={<SetName />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    );
  } else {
    showDock = DOCK_PATHS.includes(location.pathname);
    content = (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rounds" element={<RoundsArchive />} />
        <Route path="/rounds/new" element={<NewRound />} />
        <Route path="/rounds/:id/score" element={<ScoreEntry />} />
        <Route path="/rounds/:id" element={<Summary />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/bag" element={<Bag />} />
        <Route path="/me" element={<Me />} />
        <Route path="/account" element={<Account />} />
        <Route path="/duels" element={<Duels />} />
        <Route path="/player/:id" element={<PlayerProfile />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/new" element={<CreateTournament />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      {content}
      {showDock && <Dock />}
    </div>
  );
}
