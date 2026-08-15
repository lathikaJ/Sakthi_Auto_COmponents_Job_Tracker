import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  employee_number: string;
  full_name: string;
  department: string;
  designation: string;
};

type AuthValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: "admin" | "employee" | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  loading: true,
  session: null,
  user: null,
  profile: null,
  role: null,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<"admin" | "employee" | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    const ROSTER: Record<string, { name: string; role: "admin" | "employee"; department: string; designation: string }> = {
      "1001": { name: "R. Manikandan", role: "admin",    department: "Quality Assurance", designation: "Audit Manager"      },
      "1002": { name: "S. Priya",      role: "employee", department: "QA Engineering",    designation: "QA Engineer"         },
      "1003": { name: "K. Arun Kumar", role: "employee", department: "Production",         designation: "Line Supervisor"     },
      "1004": { name: "M. Deepa",      role: "employee", department: "Production",         designation: "Process Inspector"   },
      "1005": { name: "V. Saravanan",  role: "employee", department: "Production",         designation: "Shift Engineer"      },
    };

    const load = async () => {
      if (!active) return;

      // ─── Priority 1: demo/local session ───────────────────────────────────
      if (typeof window !== "undefined") {
        const demoRaw = localStorage.getItem("sakthi_demo_session");
        if (demoRaw) {
          try {
            const demo = JSON.parse(demoRaw);
            const empNum: string = String(demo.employeeNumber || "1001");
            const info = ROSTER[empNum] ?? {
              name: demo.fullName || "Employee",
              role: "employee" as const,
              department: "Production",
              designation: "Inspector",
            };
            setSession({
              access_token: "demo_token",
              token_type: "bearer",
              expires_in: 3600,
              refresh_token: "demo_refresh",
              user: {
                id: empNum,
                app_metadata: {},
                user_metadata: { employee_number: empNum, full_name: info.name },
                aud: "authenticated",
                created_at: new Date().toISOString(),
                email: `emp${empNum}@sakthispark.local`,
              },
            } as Session);
            setProfile({
              id: empNum,
              employee_number: empNum,
              full_name: info.name,
              department: info.department,
              designation: info.designation,
            });
            setRole(info.role);
            setLoading(false);
            return;
          } catch {
            // Malformed JSON – fall through to Supabase
          }
        }
      }

      // ─── Priority 2: live Supabase session ────────────────────────────────
      const { data } = await supabase.auth.getSession();
      const next = data.session;
      if (!active) return;
      if (next?.user) {
        setSession(next);
        const empNum = (next.user.user_metadata?.['employee_number'] as string) || "1001";
        const info = ROSTER[empNum] ?? {
          name: (next.user.user_metadata?.['full_name'] as string) || "Employee",
          role: "employee" as const,
          department: "Production",
          designation: "Inspector",
        };

        const [{ data: p }, { data: r }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", next.user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", next.user.id).maybeSingle(),
        ]);
        if (!active) return;
        setProfile((p as Profile) ?? {
          id: next.user.id,
          employee_number: empNum,
          full_name: info.name,
          department: info.department,
          designation: info.designation,
        });
        setRole((r?.role as "admin" | "employee") ?? info.role);
        setLoading(false);
        return;
      }

      // ─── No session at all ────────────────────────────────────────────────
      setSession(null);
      setProfile(null);
      setRole(null);
      setLoading(false);
    };

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Only reload if it's a real Supabase auth event AND there's no demo session
      if (event === "SIGNED_OUT") {
        void load();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sakthi_demo_session");
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        profile,
        role,
        isAdmin: role === "admin",
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
