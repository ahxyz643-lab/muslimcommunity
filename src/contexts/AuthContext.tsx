import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Keep the session alive: when the app comes back to the foreground or the
    // network returns, resume auto-refresh and renew the token if it's near expiry.
    const revive = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      supabase.auth.startAutoRefresh();
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.expires_at && s.expires_at * 1000 - Date.now() < 5 * 60 * 1000) {
        await supabase.auth.refreshSession().catch(() => {});
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") supabase.auth.stopAutoRefresh();
    };
    document.addEventListener("visibilitychange", revive);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", revive);
    window.addEventListener("focus", revive);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", revive);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", revive);
      window.removeEventListener("focus", revive);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
