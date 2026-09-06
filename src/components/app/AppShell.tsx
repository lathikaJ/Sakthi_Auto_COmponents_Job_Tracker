import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { SakthiLogo } from "@/components/brand/SakthiLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/plans", label: "Annual Plan" },
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

  return (
    <div className="min-h-screen bg-background">
      <header className="surface-shell sticky top-0 z-30 border-b border-sidebar-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="rounded-xl bg-card px-3 py-1.5">
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
