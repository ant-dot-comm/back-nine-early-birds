import { useState } from "react";
import type { Member, Player } from "../lib/types";
import { Avatar } from "./ui";
import { personSub } from "../lib/course";

export default function AddPlayerModal({
  members,
  people,
  onAddMember,
  onAddExisting,
  onAddNew,
  onClose,
}: {
  members: Member[];
  people: Player[];
  onAddMember: (m: Member) => void;
  onAddExisting: (p: Player) => void;
  onAddNew: (name: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const fMembers = members.filter((m) => m.display_name.toLowerCase().includes(ql));
  const fPeople = people.filter((p) => p.name.toLowerCase().includes(ql));
  const exactExists =
    members.some((m) => m.display_name.toLowerCase() === ql) ||
    people.some((p) => p.name.toLowerCase() === ql);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,25,12,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 55 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade"
        style={{ width: "100%", maxWidth: "var(--maxw)", background: "var(--sand)", borderRadius: "24px 24px 0 0", padding: "22px 22px calc(20px + env(safe-area-inset-bottom))", maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="h-serif" style={{ font: "600 20px var(--serif)" }}>Add players</h2>
          <button onClick={onClose} style={{ border: "none", background: "transparent", font: "600 14px var(--sans)", color: "var(--brass)", cursor: "pointer" }}>Done</button>
        </div>

        <input
          className="input"
          autoFocus
          placeholder="Search members, or type a new name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim() && !exactExists) {
              onAddNew(q.trim());
              setQ("");
            }
          }}
        />

        <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 16, margin: "0 -4px", padding: "0 4px" }}>
          {q.trim() && !exactExists && (
            <button
              onClick={() => { onAddNew(q.trim()); setQ(""); }}
              className="card"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer", textAlign: "left", width: "100%", borderStyle: "dashed" }}
            >
              <span style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid var(--line-2)", display: "grid", placeItems: "center", font: "400 20px var(--sans)", color: "var(--muted-2)" }}>+</span>
              <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>Add “{q.trim()}” as a guest</span>
            </button>
          )}

          {fMembers.length > 0 && (
            <Section label="Members">
              {fMembers.map((m) => (
                <Row key={m.id} initials={m.initials} name={m.display_name} sub={personSub(m.first_name, m.last_name) || "Signed up · gets their score"} onClick={() => onAddMember(m)} />
              ))}
            </Section>
          )}

          {fPeople.length > 0 && (
            <Section label="Your people">
              {fPeople.map((p) => (
                <Row key={p.id} initials={p.initials} name={p.name} sub="Guest" onClick={() => onAddExisting(p)} />
              ))}
            </Section>
          )}

          {fMembers.length === 0 && fPeople.length === 0 && !q.trim() && (
            <p style={{ font: "400 14px var(--sans)", color: "var(--faint)", textAlign: "center", padding: "12px 0" }}>
              No one to add yet — type a name above to add a guest.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="eyebrow">{label}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ initials, name, sub, onClick }: { initials: string; name: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left", width: "100%" }}
    >
      <Avatar initials={initials} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>{name}</span>
        <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>{sub}</span>
      </div>
      <span style={{ font: "600 20px var(--sans)", color: "var(--brass)" }}>+</span>
    </button>
  );
}
