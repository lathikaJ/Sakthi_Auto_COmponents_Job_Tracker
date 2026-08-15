import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SakthiLogo } from "@/components/brand/SakthiLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  "1001": { name: "R. Manikandan", role: "admin",    department: "Quality Assurance", designation: "Audit Manager"    },
  "1002": { name: "S. Priya",      role: "employee", department: "QA Engineering",    designation: "QA Engineer"       },
  "1003": { name: "K. Arun Kumar", role: "employee", department: "Production",         designation: "Line Supervisor"   },
  "1004": { name: "M. Deepa",      role: "employee", department: "Production",         designation: "Process Inspector" },
  "1005": { name: "V. Saravanan",  role: "employee", department: "Production",         designation: "Shift Engineer"    },
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
      }

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
          <div className="rounded-2xl bg-card p-5 shadow-lift">
            <SakthiLogo />
          </div>
          <p className="mt-5 text-center text-lg font-medium text-slate-deep-foreground">
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
                placeholder="Employee Number (e.g. 1001)"
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

        {/* Roster hint */}
        <p className="mt-6 text-center text-xs text-slate-deep-foreground/70">
          Admin: <strong>1001</strong> · Employees: <strong>1002, 1003, 1004, 1005</strong>
        </p>
      </div>
    </div>
  );
}
