import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui";
import { personSub } from "../lib/course";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faGear, faRightFromBracket, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export default function AccountDrawer({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const sub = personSub(profile?.first_name ?? null, profile?.last_name ?? null);

  function go(path: string) {
    onClose();
    navigate(path);
  }

  const items: { icon: IconDefinition; label: string; onClick: () => void }[] = [
    { icon: faUser, label: "View profile", onClick: () => profile && go(`/player/${profile.id}`) },
    { icon: faGear, label: "Settings", onClick: () => go("/account") },
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,25,12,.45)", zIndex: 70, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="drawer-in"
        style={{
          width: "80%", maxWidth: 320, height: "100%", background: "var(--sand)",
          display: "flex", flexDirection: "column", padding: "0 0 24px",
          boxShadow: "-8px 0 30px rgba(20,25,12,.2)",
        }}
      >
        <div className="safe-top" style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px 20px" }}>
          <Avatar initials={profile?.initials ?? "9"} me size={52} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span className="h-serif" style={{ font: "600 19px var(--serif)", color: "var(--green-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.display_name ?? "Your account"}
            </span>
            {sub && <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>{sub}</span>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "4px 12px", gap: 2 }}>
          {items.map((it) => (
            <button
              key={it.label}
              onClick={it.onClick}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 12, textAlign: "left", font: "500 16px var(--sans)", color: "var(--ink)" }}
            >
              <FontAwesomeIcon icon={it.icon} style={{ color: "var(--brass)", fontSize: 16, width: 20 }} />
              <span style={{ flex: 1 }}>{it.label}</span>
              <FontAwesomeIcon icon={faChevronRight} style={{ color: "var(--faint)", fontSize: 12 }} />
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ padding: "0 12px" }}>
          <button
            onClick={async () => { onClose(); await signOut(); navigate("/login", { replace: true }); }}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", width: "100%", border: "none", background: "transparent", cursor: "pointer", borderRadius: 12, textAlign: "left", font: "500 16px var(--sans)", color: "var(--muted-2)" }}
          >
            <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 16, width: 20 }} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
