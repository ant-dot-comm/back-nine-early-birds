// A pending invite token carried from the invite link through the signup flow.
const KEY = "pendingInvite";

export interface PendingInvite {
  token: string;
  first: string;
  last: string;
}

/** Capture ?invite=&first=&last= from the URL into storage (call before render). */
export function capturePendingInviteFromUrl(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    const token = p.get("invite");
    if (token) {
      const inv: PendingInvite = {
        token,
        first: p.get("first") ?? "",
        last: p.get("last") ?? "",
      };
      localStorage.setItem(KEY, JSON.stringify(inv));
    }
  } catch {
    /* ignore */
  }
}

export function getPendingInvite(): PendingInvite | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as PendingInvite) : null;
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  localStorage.removeItem(KEY);
}
