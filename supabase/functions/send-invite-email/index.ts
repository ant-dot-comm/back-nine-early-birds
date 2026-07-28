// Emails a score + signup invite via Resend.
// Requires secret: RESEND_API_KEY. Optional: INVITE_FROM, SITE_URL (have defaults).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function toParLabel(d: number): string {
  if (d === 0) return "E";
  return d > 0 ? `+${d}` : `−${Math.abs(d)}`;
}

interface Score { hole: number; par: number; strokes: number; gir: boolean }

function buildHtml(inv: Record<string, unknown>, total: number, diff: number, link: string): string {
  const scores = (inv.scores as Score[]) ?? [];
  const cells = scores
    .map((s) => {
      const under = s.strokes < s.par;
      const bg = under ? "#f0e4c6" : "#fbf6ea";
      return `<td style="text-align:center;padding:6px 4px;border:1px solid #eaddc2;background:${bg};font-weight:600;">${s.strokes}</td>`;
    })
    .join("");
  const nums = scores
    .map((s) => `<td style="text-align:center;padding:4px;font-size:11px;color:#8a8272;">${s.hole}</td>`)
    .join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e7dcc6;margin:0;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#f4ecdd;border:1px solid #d8cbb0;border-radius:22px;overflow:hidden;">
        <tr><td style="background:#16381a;padding:24px 30px;">
          <span style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#f4ecdd;">Back&nbsp;9</span>
          <span style="margin-left:8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#d8b25a;">Early Birds</span>
        </td></tr>
        <tr><td style="padding:30px 30px 8px;">
          <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;color:#16381a;">${inv.inviter_display} logged your round</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#5c5445;">Here's how ${inv.player_name} played at ${inv.course}. Sign up to keep it in your own profile and log the next one.</p>
          <div style="text-align:center;padding:14px 0;">
            <span style="font-family:Helvetica,Arial,sans-serif;font-size:40px;font-weight:700;color:#16381a;">${total}</span>
            <span style="font-size:18px;font-weight:600;color:#a9812f;margin-left:8px;">${toParLabel(diff)}</span>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 22px;">
            <tr>${nums}</tr>
            <tr>${cells}</tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="border-radius:14px;background:#16381a;">
              <a href="${link}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:600;color:#f4ecdd;text-decoration:none;border-radius:14px;">Sign up &amp; claim your round</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 30px 28px;border-top:1px solid #e0d3b6;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8272;">You're getting this because ${inv.inviter_display} shared a round with you on Back 9 Early Birds at Mission Trails.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token } = await req.json();
    if (!token) return json({ error: "Missing token" }, 400);

    // Read the invite under the caller's own RLS — only the owner can.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: inv, error } = await supabase
      .from("invites")
      .select("*")
      .eq("token", token)
      .single();
    if (error || !inv) return json({ error: "Invite not found" }, 404);
    if (!inv.recipient_email) return json({ error: "No recipient email" }, 400);

    const RESEND = Deno.env.get("RESEND_API_KEY");
    if (!RESEND) return json({ error: "Email not configured" }, 503);
    // Sensible defaults so RESEND_API_KEY is the only required secret.
    const FROM = Deno.env.get("INVITE_FROM") ?? "Back 9 Early Birds <onboarding@resend.dev>";
    const SITE = Deno.env.get("SITE_URL") ?? "https://back-nine-early-birds.vercel.app";

    const scores = (inv.scores as Score[]) ?? [];
    const total = scores.reduce((s, x) => s + (x.strokes ?? 0), 0);
    const par = scores.reduce((s, x) => s + (x.par ?? 0), 0);
    const link =
      `${SITE}/login?invite=${inv.token}` +
      `&first=${encodeURIComponent(inv.prefill_first ?? "")}` +
      `&last=${encodeURIComponent(inv.prefill_last ?? "")}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: inv.recipient_email,
        subject: `${inv.inviter_display} shared your round — Back 9 Early Birds`,
        html: buildHtml(inv, total, total - par, link),
      }),
    });
    if (!res.ok) return json({ error: `Send failed: ${await res.text()}` }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
