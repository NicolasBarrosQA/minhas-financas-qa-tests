import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setActiveUserId } from "@/lib/sessionScope";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nickname?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const recurrenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRecurrenceRunAtRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const clearRecurrenceTicker = () => {
      if (recurrenceIntervalRef.current) {
        clearInterval(recurrenceIntervalRef.current);
        recurrenceIntervalRef.current = null;
      }
    };

    const processDueRecurrences = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastRecurrenceRunAtRef.current < 5 * 60_000) return;

      const { error } = await supabase.functions.invoke("process-recurrences", {
        body: { limit: 100 },
      });

      if (error) {
        console.warn("Failed to process due recurrences", error.message);
        return;
      }

      lastRecurrenceRunAtRef.current = now;
    };

    const configureRecurrenceTicker = (nextUserId: string | null) => {
      clearRecurrenceTicker();
      if (!nextUserId) return;

      void processDueRecurrences(true);
      recurrenceIntervalRef.current = setInterval(() => {
        void processDueRecurrences();
      }, 5 * 60_000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void processDueRecurrences();
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      lastUserIdRef.current = data.session?.user?.id ?? null;
      setActiveUserId(lastUserIdRef.current);
      configureRecurrenceTicker(lastUserIdRef.current);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id ?? null;
      if (lastUserIdRef.current !== nextUserId) {
        queryClient.clear();
      }

      lastUserIdRef.current = nextUserId;
      setActiveUserId(nextUserId);
      configureRecurrenceTicker(nextUserId);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      clearRecurrenceTicker();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    const displayName = nickname?.trim() || email.split("@")[0] || null;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: displayName,
        },
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      queryClient.clear();
      setActiveUserId(null);
      lastUserIdRef.current = null;
    }
    return { error: error?.message ?? null };
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
