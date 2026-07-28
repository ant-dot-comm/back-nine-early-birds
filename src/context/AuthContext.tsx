import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getProfile } from "../lib/db";
import type { Profile } from "../lib/types";

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** True while the user arrived via a password-reset link and must set a new password. */
  recovery: boolean;
  clearRecovery: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovery, setRecovery] = useState(false);

  async function loadProfile(uid: string | undefined) {
    if (!uid) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await getProfile(uid));
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(sess);
      await loadProfile(sess?.user.id);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    loading,
    session,
    profile,
    recovery,
    clearRecovery: () => setRecovery(false),
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setRecovery(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
