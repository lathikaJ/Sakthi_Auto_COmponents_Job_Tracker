import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SakthiLogo } from "@/components/brand/SakthiLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordActivityLog } from "@/lib/activityLogs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — Sakthi Auto Value Added Engineering" },
      {
        name: "description",
        content:
          "Sign in with your Sakthi Auto employee number to access audit plans, assignments and deviation reporting.",
      },
      { property: "og:title", content: "Sign In — Sakthi Auto Value Added Engineering" },
    ],
  }),
  component: SignInPage,
});

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

function SignInPage() {
  const navigate = useNavigate();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const empNum = employeeNumber.trim();

    if (!empNum) {
      toast.error("Please enter your Employee Number.");
      return;
    }

    if (!ROSTER[empNum]) {
      toast.error(`Employee #${empNum} not found. Please check your ID.`);
      return;
    }

    setBusy(true);
    try {
      const info = ROSTER[empNum];

      // Persist demo session to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "sakthi_demo_session",
          JSON.stringify({
            employeeNumber: empNum,
            fullName: info.name,
            role: info.role,
            department: info.department,
            designation: info.designation,
          })
        );
        window.dispatchEvent(new Event("sakthi_auth_state_changed"));
      }

      // Record login event for admin tracking
      recordActivityLog({
        employee_number: empNum,
        full_name: info.name,
        department: info.department,
        designation: info.designation,
        role: info.role,
        event_type: "LOGIN",
      });

      toast.success(`Welcome, ${info.name}!`, {
        description: `Logged in as ${info.role === "admin" ? "Admin" : "Employee"} · ${info.department}`,
      });

      await navigate({ to: "/dashboard" });
    } catch {
      toast.error("Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const empInfo = ROSTER[employeeNumber.trim()];

  return (
    <div className="surface-shell flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-white px-7 py-3 shadow-md border border-slate-200 flex items-center justify-center">
            <SakthiLogo imgClassName="h-12 sm:h-14 w-auto object-contain" />
          </div>
          <p className="mt-4 text-center text-lg font-black uppercase tracking-wider text-white drop-shadow-sm">
            Value Added Engineering
          </p>
        </div>

        {/* Sign In Card */}
        <div className="card-elevated mt-8 p-6">
          <h1 className="text-center text-3xl font-semibold text-brand">Sign In</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your Employee ID to continue
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-1.5">
              <Input
                id="employeeNumber"
                placeholder="Employee Number (e.g. 690867)"
                inputMode="numeric"
                autoComplete="username"
                autoFocus
                maxLength={10}
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-base text-center tracking-widest font-bold"
              />
              {/* Live name preview */}
              {empInfo && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="text-xs font-bold text-emerald-800">{empInfo.name}</span>
                  <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 uppercase">
                    {empInfo.role}
                  </span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base font-bold"
              disabled={busy || !employeeNumber.trim()}
            >
              {busy ? "Signing in…" : "Sign In →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
