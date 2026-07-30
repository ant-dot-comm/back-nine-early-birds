import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicProfile, getPublicBadges } from "../lib/db";
import type { PublicProfile, Badge } from "../lib/types";
import { TopBar, FullSpinner } from "../components/ui";
import ProfileBody from "../components/ProfileBody";
import { C } from "../lib/paint";

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<PublicProfile | null | undefined>(undefined);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!id) return;
    getPublicProfile(id).then(setP).catch(() => setP(null));
    getPublicBadges(id).then(setBadges).catch(() => setBadges([]));
  }, [id]);

  return (
    <div className="screen fade">
      <TopBar title="Player" onBack="auto" />
      <div className="scroll">
        <div className="pad">
          {p === undefined ? <FullSpinner /> : p === null ? <div className="center-screen"><span style={{ color: C.tx3 }}>Player not found.</span></div> : <ProfileBody p={p} badges={badges} />}
        </div>
      </div>
    </div>
  );
}
