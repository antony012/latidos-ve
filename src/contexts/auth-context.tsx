"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AppRole } from "@/lib/auth/roles";
import { signOutGoogle } from "@/lib/auth/google-sign-in";
import {
  clearUserSession,
  getUserSession,
  setUserSession,
  type UserSession,
} from "@/lib/store/demo-store";
import { subscribeStoreUpdate } from "@/lib/store/events";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

interface AuthContextValue {
  session: UserSession | null;
  isLoading: boolean;
  login: (session: UserSession) => void;
  logout: () => void;
  hasRole: (...roles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromSupabaseUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): UserSession {
  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "Donante";

  return {
    userId: user.id,
    role: "donor",
    name: fullName,
    email: user.email ?? undefined,
    provider: "google",
    loggedInAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setSession(getUserSession());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    if (!supabase) {
      refresh();
      return subscribeStoreUpdate(refresh);
    }

    const syncSupabaseUser = (
      user: Parameters<typeof sessionFromSupabaseUser>[0] | null
    ) => {
      if (user) {
        setUserSession(sessionFromSupabaseUser(user));
      }
      refresh();
    };

    void supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
      syncSupabaseUser(sbSession?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      if (sbSession?.user) {
        syncSupabaseUser(sbSession.user);
      } else if (!getUserSession()?.provider) {
        clearUserSession();
        refresh();
      }
    });

    const unsubStore = subscribeStoreUpdate(refresh);

    return () => {
      subscription.unsubscribe();
      unsubStore();
    };
  }, [refresh]);

  const login = useCallback((s: UserSession) => {
    setUserSession(s);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    if (getUserSession()?.role === "super_admin") {
      void fetch("/api/auth/ops/logout", { method: "POST" });
    }
    void signOutGoogle();
    clearUserSession();
    setSession(null);
  }, []);

  const hasRole = useCallback(
    (...roles: AppRole[]) => {
      if (!session) return false;
      return roles.includes(session.role);
    },
    [session]
  );

  return (
    <AuthContext.Provider
      value={{ session, isLoading, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
