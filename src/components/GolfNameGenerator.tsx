import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDice, faStar } from "@fortawesome/free-solid-svg-icons";
import {
  ADJECTIVES, NOUNS, NICKNAMES, SECRET_NAMES, randomGolfName, formatGolfName, type GolfNameParts,
} from "../lib/golfNames";
import { rollSecretName } from "../lib/db";
import type { DisplayNameType } from "../lib/types";

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
  /** Dev/testing: start in the ultra-rare reveal state (no real grant). */
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

  // Emit the initial name once.
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
        if (hit) {
          setSecret(hit);
          onChange({ name: hit, type: "secret", secret: hit });
          setRolling(false);
          return;
        }
      } catch {
        /* fall through to a standard reroll */
      }
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

  function pickUnlocked(name: string) {
    setSecret(name);
    onChange({ name, type: "secret", secret: name });
  }

  const showManual = manual || rerolls >= REROLLS_BEFORE_MANUAL;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* tab toggle */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 4 }}>
        {(["golf", "custom"] as const).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                if (t === "golf") emitGenerated(parts);
                else onChange({ name: custom, type: "custom" });
              }}
              style={{ flex: 1, height: 40, borderRadius: 9, border: "none", cursor: "pointer", font: "600 14px var(--sans)", background: on ? "var(--green-900)" : "transparent", color: on ? "var(--sand)" : "var(--muted)" }}
            >
              {t === "golf" ? "Golf name" : "Type my own"}
            </button>
          );
        })}
      </div>

      {tab === "golf" ? (
        <>
          {/* preview */}
          {secret ? (
            <div className="fade-pop" style={{ background: "var(--green-900)", borderRadius: 16, padding: "18px 16px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6, border: "2px solid var(--gold)" }}>
              <span style={{ font: "700 10px var(--sans)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)" }}>
                <FontAwesomeIcon icon={faStar} /> Ultra-rare golf name
              </span>
              <span className="h-serif" style={{ font: "600 26px var(--serif)", color: "var(--sand)" }}>{secret}</span>
              <span style={{ font: "400 11px var(--sans)", color: "#9fb39a" }}>Rerolling gives it up.</span>
            </div>
          ) : (
            <div className="card" style={{ padding: "18px 16px", textAlign: "center" }}>
              <span className="h-serif" style={{ font: "600 24px/1.2 var(--serif)", color: "var(--green-900)" }}>{formatGolfName(parts)}</span>
            </div>
          )}

          <button
            type="button"
            className="btn"
            onClick={reroll}
            disabled={rolling}
            style={{ height: 50 }}
          >
            {rolling ? <span className="spin on-dark" /> : <><FontAwesomeIcon icon={faDice} /> {secret ? "Reroll (give it up)" : "Reroll"}</>}
          </button>

          {!showManual && !secret && (
            <button type="button" onClick={() => setManual(true)} style={{ border: "none", background: "transparent", font: "500 13px var(--sans)", color: "var(--brass)", cursor: "pointer", alignSelf: "center" }}>
              Or choose each part
            </button>
          )}

          {showManual && !secret && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PartSelect label="Prefix" value={parts.adjective} options={ADJECTIVES} onChange={(v) => setPart("adjective", v)} />
              <PartSelect label="Golf term" value={parts.noun} options={NOUNS} onChange={(v) => setPart("noun", v)} />
              <PartSelect label="Nickname" value={parts.nickname} options={NICKNAMES} onChange={(v) => setPart("nickname", v)} />
            </div>
          )}

          {unlockedSecrets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <span className="eyebrow"><FontAwesomeIcon icon={faStar} /> Unlocked secret names</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {unlockedSecrets.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pickUnlocked(s)}
                    className="chip"
                    style={{ cursor: "pointer", border: secret === s ? "1.5px solid var(--green-900)" : "1px solid var(--chip-line)", background: secret === s ? "var(--green-900)" : "var(--chip-bg)", color: secret === s ? "var(--sand)" : "var(--label-gold)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="field">
          <label className="label">Display name</label>
          <input
            className="input"
            autoFocus
            value={custom}
            placeholder="Type any name"
            maxLength={40}
            onChange={(e) => {
              setCustom(e.target.value);
              onChange({ name: e.target.value, type: "custom" });
            }}
          />
        </div>
      )}
    </div>
  );
}

function PartSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 78, flex: "none", font: "500 12px var(--sans)", color: "var(--faint)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid var(--line-2)", background: "var(--input-bg)", padding: "0 12px", font: "500 15px var(--sans)", color: "var(--ink)" }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
