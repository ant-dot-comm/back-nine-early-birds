import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDice, faStar } from "@fortawesome/free-solid-svg-icons";
import {
  ADJECTIVES, NOUNS, NICKNAMES, SECRET_NAMES, randomGolfName, formatGolfName, type GolfNameParts,
} from "../lib/golfNames";
import { rollSecretName } from "../lib/db";
import type { DisplayNameType } from "../lib/types";
import { C, ELEV } from "../lib/paint";

export interface NameSelection {
  name: string;
  type: DisplayNameType;
  parts?: GolfNameParts | null;
  secret?: string | null;
}

const REROLLS_BEFORE_MANUAL = 5;

export default function GolfNameGenerator({
  allowSecret = false,
  unlockedSecrets = [],
  previewSecret = false,
  onChange,
}: {
  allowSecret?: boolean;
  unlockedSecrets?: string[];
  previewSecret?: boolean;
  onChange: (sel: NameSelection) => void;
}) {
  const [tab, setTab] = useState<"golf" | "custom">("golf");
  const [parts, setParts] = useState<GolfNameParts>(() => randomGolfName());
  const [rerolls, setRerolls] = useState(0);
  const [manual, setManual] = useState(false);
  const [custom, setCustom] = useState("");
  const [secret, setSecret] = useState<string | null>(previewSecret ? SECRET_NAMES[0] : null);
  const [rolling, setRolling] = useState(false);
  const emitted = useRef(false);

  useEffect(() => {
    if (!emitted.current) {
      emitted.current = true;
      if (previewSecret) onChange({ name: SECRET_NAMES[0], type: "secret", secret: SECRET_NAMES[0] });
      else onChange({ name: formatGolfName(parts), type: "generated", parts });
    }
  }, [parts, onChange, previewSecret]);

  function emitGenerated(p: GolfNameParts) {
    setSecret(null);
    onChange({ name: formatGolfName(p), type: "generated", parts: p });
  }

  async function reroll() {
    if (rolling) return;
    setRerolls((n) => n + 1);
    if (allowSecret) {
      setRolling(true);
      try {
        const hit = await rollSecretName();
        if (hit) { setSecret(hit); onChange({ name: hit, type: "secret", secret: hit }); setRolling(false); return; }
      } catch { /* fall through */ }
      setRolling(false);
    }
    const p = randomGolfName();
    setParts(p);
    emitGenerated(p);
  }

  function setPart(key: keyof GolfNameParts, val: string) {
    const p = { ...parts, [key]: val };
    setParts(p);
    emitGenerated(p);
  }
  function pickUnlocked(name: string) { setSecret(name); onChange({ name, type: "secret", secret: name }); }

  const showManual = manual || rerolls >= REROLLS_BEFORE_MANUAL;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 4, background: C.shade2, boxShadow: ELEV.e0, borderRadius: 12, padding: 4 }}>
        {(["golf", "custom"] as const).map((t) => {
          const on = tab === t;
          return (
            <button key={t} type="button"
              onClick={() => { setTab(t); if (t === "golf") emitGenerated(parts); else onChange({ name: custom, type: "custom" }); }}
              style={{ flex: 1, height: 40, borderRadius: 9, border: "none", cursor: "pointer", font: "600 14px var(--sans)", background: on ? C.paper : "transparent", color: on ? C.ink : C.tx3 }}>
              {t === "golf" ? "Roll a name" : "Type my own"}
            </button>
          );
        })}
      </div>

      {tab === "golf" ? (
        <>
          {secret ? (
            <div className="fade-pop surf-flag" style={{ borderRadius: 16, padding: "18px 16px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "600 9px var(--sans)", letterSpacing: "0.16em", textTransform: "uppercase", color: C.cream }}>
                <FontAwesomeIcon icon={faStar} /> One of one
              </span>
              <span className="hand" style={{ font: "400 40px/.9 var(--hand)", color: C.cream }}>{secret}</span>
              <span style={{ font: "500 11px var(--sans)", color: "#F3D9C9" }}>Reroll and you hand it back.</span>
            </div>
          ) : (
            <div className="surf-raised" style={{ borderRadius: 16, padding: "20px 16px", textAlign: "center" }}>
              <span style={{ font: "600 26px/1.1 var(--sans)", color: C.tx }}>{formatGolfName(parts)}</span>
            </div>
          )}

          <button type="button" className={secret ? "btn ghost" : "btn"} onClick={reroll} disabled={rolling} style={{ height: 50 }}>
            {rolling ? <span className={secret ? "spin" : "spin on-dark"} /> : <><FontAwesomeIcon icon={faDice} /> {secret ? "Reroll (give it up)" : "Reroll"}</>}
          </button>

          {!showManual && !secret && (
            <button type="button" onClick={() => setManual(true)} style={{ border: "none", background: "transparent", font: "600 13px var(--sans)", color: C.sand, cursor: "pointer", alignSelf: "center" }}>
              Or build it yourself
            </button>
          )}

          {showManual && !secret && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PartSelect label="Prefix" value={parts.adjective} options={ADJECTIVES} onChange={(v) => setPart("adjective", v)} />
              <PartSelect label="Term" value={parts.noun} options={NOUNS} onChange={(v) => setPart("noun", v)} />
              <PartSelect label="Handle" value={parts.nickname} options={NICKNAMES} onChange={(v) => setPart("nickname", v)} />
            </div>
          )}

          {unlockedSecrets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <span className="eyebrow"><FontAwesomeIcon icon={faStar} /> Unlocked secret names</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {unlockedSecrets.map((s) => (
                  <button key={s} type="button" onClick={() => pickUnlocked(s)} className={`chip${secret === s ? " on" : ""}`} style={{ cursor: "pointer" }}>{s}</button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="field">
          <label className="label">Display name</label>
          <input className="input" autoFocus value={custom} placeholder="Type any name" maxLength={40}
            onChange={(e) => { setCustom(e.target.value); onChange({ name: e.target.value, type: "custom" }); }} />
        </div>
      )}
    </div>
  );
}

function PartSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 64, flex: "none", font: "600 11px var(--sans)", letterSpacing: ".06em", textTransform: "uppercase", color: C.fescue }}>{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
