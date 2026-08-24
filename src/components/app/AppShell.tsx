import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Clock } from "lucide-react";
import { format } from "date-fns";

import { SakthiLogo } from "@/components/brand/SakthiLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/assignments", label: "Assignments" },
  { to: "/review", label: "Review Queue" },
  { to: "/deviations", label: "Deviations" },
] as const;

const EMPLOYEE_NAV = [
  { to: "/dashboard", label: "My Work Queue" },
  { to: "/deviations", label: "My Deviations" },
] as const;

export function AppShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { profile, isAdmin, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="surface-shell sticky top-0 z-30 border-b border-sidebar-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="rounded-xl bg-card px-3 py-1.5 flex items-center gap-2">
            <SakthiLogo />
          </div>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {nav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand text-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-sidebar-foreground">
                {profile?.full_name ?? "—"}
              </p>
              <p className="text-xs text-sidebar-foreground/70">
                {profile?.employee_number} · {isAdmin ? "Admin" : "Employee"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => void signOut()}
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Personalized Welcome Banner with Sakthi Auto Brand Colors & Live Clock */}
        {profile?.full_name && (
          <div className="mb-6 rounded-2xl border border-orange-400/40 bg-gradient-to-r from-orange-600 via-amber-600 to-slate-900 p-5 text-white shadow-md flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 drop-shadow-xs">
                Welcome, {profile.full_name}
              </h2>
            </div>

            {/* Live Ticking Time Display */}
            <div className="flex flex-col items-end gap-1.5 bg-black/20 px-4 py-2.5 rounded-xl border border-white/20 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Clock className="h-4 w-4 text-amber-300 animate-pulse" />
                <span className="font-mono text-sm tracking-wider font-extrabold text-amber-300">
                  {format(now, "hh:mm:ss a")}
                </span>
              </div>
              <p className="text-[10px] font-mono text-amber-100 font-medium">
                {format(now, "EEE, dd MMM yyyy")} · Live System Time
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}
