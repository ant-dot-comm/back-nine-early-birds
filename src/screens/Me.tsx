import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPublicProfile, getPublicBadges } from "../lib/db";
import type { PublicProfile, Badge } from "../lib/types";
import { FullSpinner } from "../components/ui";
import ProfileBody from "../components/ProfileBody";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { C } from "../lib/paint";

export default function Me() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<PublicProfile | null | undefined>(undefined);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    getPublicProfile(profile.id).then(setP).catch(() => setP(null));
    getPublicBadges(profile.id).then(setBadges).catch(() => setBadges([]));
  }, [profile?.id]);

  return (
    <div className="screen fade">
      <div className="safe-top" style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px 8px" }}>
        <span style={{ font: "600 18px var(--sans)", color: C.tx }}>Me</span>
        <button onClick={() => navigate("/account")} aria-label="Settings" style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--line)", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}>
          <FontAwesomeIcon icon={faGear} style={{ color: C.tx2, fontSize: 16 }} />
        </button>
      </div>
      <div className="scroll">
        <div className="pad pad-dock">
          {p === undefined ? <FullSpinner /> : p === null ? <span style={{ color: C.tx3 }}>Couldn't load your profile.</span> : <ProfileBody p={p} badges={badges} />}
        </div>
      </div>
    </div>
  );
}
