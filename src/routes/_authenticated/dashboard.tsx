import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Package,
  RefreshCcw,
  Timer,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Sakthi Spark Audit Platform" },
      {
        name: "description",
        content: "Audit metrics, work queue and deviation overview for the current period.",
      },
      { property: "og:title", content: "Dashboard — Sakthi Spark Audit Platform" },
      { property: "og:description", content: "Live audit metrics and assigned work queue." },
    ],
  }),
  component: DashboardPage,
});

type Assignment = {
  id: string;
  audit_code: string;
  title: string;
  audit_type: string;
  area: string;
  month: number;
  year: number;
  due_date: string;
  status: string;
  assigned_to_employee_number: string;
};

function DashboardPage() {
  const { isAdmin, profile, loading } = useAuth();

  const assignments = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_assignments")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });

  const deviations = useQuery({
    queryKey: ["deviations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_deviations")
        .select("id, status, description, created_at, employee_number")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = assignments.data ?? [];
  const devs = deviations.data ?? [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    const active = rows.filter((r) => r.status !== "Completed" && r.status !== "Submitted");
    const done = rows.filter((r) => r.status === "Completed" || r.status === "Submitted");
    return (
      <AppShell
        title={`Welcome, ${profile?.full_name ?? "Auditor"}`}
        description="Your assigned audits for the current period. Open an audit to record checkpoints, upload evidence and sign off."
      >
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Active work queue ({active.length})
          </h2>
          {active.length === 0 ? (
            <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
              No open audits assigned to you right now.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((r) => (
                <QueueCard key={r.id} row={r} />
              ))}
            </div>
          )}

          <h2 className="pt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Submitted & completed ({done.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {done.map((r) => (
              <QueueCard key={r.id} row={r} />
            ))}
          </div>
        </section>
      </AppShell>
    );
  }

  const metrics = [
    {
      key: "all",
      label: "Total Audit",
      value: rows.length,
      hint: "Planned, active and completed",
      icon: ClipboardList,
    },
    {
      key: "Product",
      label: "Product Audit",
      value: rows.filter((r) => r.audit_type === "Product").length,
      hint: "Product & process compliance",
      icon: Package,
    },
    {
      key: "Revalidation",
      label: "Revalidation Audit",
      value: rows.filter((r) => r.audit_type === "Revalidation").length,
      hint: "Periodic verification schedules",
      icon: RefreshCcw,
    },
    {
      key: "ongoing",
      label: "Ongoing Audit",
      value: rows.filter((r) => ["Assigned", "In Progress", "Overdue"].includes(r.status)).length,
      hint: "Active monthly assignments",
      icon: Timer,
    },
    {
      key: "completed",
      label: "Completed Audit",
      value: rows.filter((r) => r.status === "Completed").length,
      hint: "Verified historical records",
      icon: CheckCircle2,
    },
    {
      key: "deviation",
      label: "Deviation Audit",
      value: devs.filter((d) => d.status !== "Closed").length,
      hint: "Open non-conformances",
      icon: AlertTriangle,
    },
  ] as const;

  return (
    <AppShell
      title="Audit Control Dashboard"
      description="Plant-wide overview of the audit programme. Select a card to drill into the records."
      action={
        <Button asChild>
          <Link to="/assignments">New monthly assignment</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Link
            key={m.key}
            to={m.key === "deviation" ? "/deviations" : "/audits"}
            search={m.key === "deviation" ? undefined : { filter: m.key }}
            className="card-elevated group flex flex-col gap-3 p-5 transition-shadow hover:shadow-lift"
          >
            <div className="flex items-start justify-between">
              <span className="text-sm font-semibold text-muted-foreground">{m.label}</span>
              <span className="rounded-lg bg-accent p-2 text-accent-foreground">
                <m.icon className="h-4 w-4" />
              </span>
            </div>
            <span className="text-4xl font-bold tabular-nums text-foreground">{m.value}</span>
            <span className="text-xs text-muted-foreground">{m.hint}</span>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent assignments
        </h2>
        <div className="card-elevated overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Audit</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Auditor</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link
                      to="/audit/$auditId"
                      params={{ auditId: r.id }}
                      className="font-medium text-foreground hover:text-brand"
                    >
                      {r.audit_code} · {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.audit_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.assigned_to_employee_number}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.due_date}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No assignments yet. Create an annual plan, then assign audits by month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function QueueCard({ row }: { row: Assignment }) {
  return (
    <Link
      to="/audit/$auditId"
      params={{ auditId: row.id }}
      className="card-elevated flex flex-col gap-2 p-5 transition-shadow hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand">{row.audit_code}</p>
          <p className="font-semibold text-foreground">{row.title}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {row.audit_type} audit · {row.area}
      </p>
      <p className="text-xs text-muted-foreground">Due {row.due_date}</p>
    </Link>
  );
}
