import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { recordActivityLog } from "@/lib/activityLogs";

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
      "690867": { name: "KARTHIKEYAN C", role: "admin",    department: "Quality Assurance", designation: "Quality Operations Lead" },
      "688079": { name: "SILAMBARASAN S", role: "employee", department: "Machining Line 1",  designation: "Senior Quality Engineer" },
      "663875": { name: "VENKADESH D",    role: "employee", department: "Machine Shop 2",    designation: "Quality Inspector"        },
      "710250": { name: "MOUNIKASRI A",   role: "employee", department: "Quality Lab",       designation: "Metrology Specialist"     },
      "666468": { name: "KAVIN KUMAR K",  role: "employee", department: "Assembly & Dock",   designation: "Process Audit Lead"       },
      "665773": { name: "KARTHEEBAN K",   role: "employee", department: "Value Added Engg",  designation: "Revalidation Specialist"  },
      "665965": { name: "DINESHKUMAR A B",role: "employee", department: "Tool Room",         designation: "Maintenance Lead"         },
      "708818": { name: "SELVAKUMAR J",   role: "employee", department: "EHS & Safety",      designation: "Compliance Auditor"       },
      "667685": { name: "GEETHA S",       role: "employee", department: "Plant Management",  designation: "Plant Head Quality"       },
    };

    const load = async () => {
      if (!active) return;

      // ─── Priority 1: demo/local session ───────────────────────────────────
      if (typeof window !== "undefined") {
        const demoRaw = localStorage.getItem("sakthi_demo_session");
        if (demoRaw) {
          try {
            const demo = JSON.parse(demoRaw);
            const empNum: string = String(demo.employeeNumber || "690867");
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
        const empNum = (next.user.user_metadata?.['employee_number'] as string) || "690867";
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

      // ─── No active session ────────────────────────────────────────────────
      setSession(null);
      setProfile(null);
      setRole(null);
      setLoading(false);
    };

    void load();

    const handleCustomAuth = () => {
      void load();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("sakthi_auth_state_changed", handleCustomAuth);
      window.addEventListener("storage", handleCustomAuth);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void load();
      }
    });

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("sakthi_auth_state_changed", handleCustomAuth);
        window.removeEventListener("storage", handleCustomAuth);
      }
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = async () => {
    if (profile) {
      recordActivityLog({
        employee_number: profile.employee_number,
        full_name: profile.full_name,
        department: profile.department,
        designation: profile.designation,
        role: role || "employee",
        event_type: "LOGOUT",
      });
    }
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
