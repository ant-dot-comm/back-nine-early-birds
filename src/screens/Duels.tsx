import { TopBar } from "../components/ui";

export default function Duels() {
  return (
    <div className="screen fade">
      <TopBar title="Duels" />
      <div className="scroll"><div className="pad pad-dock" style={{ color: "var(--fescue)" }}>Coming together…</div></div>
    </div>
  );
}
