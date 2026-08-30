import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { DEFAULT_OFFICIAL_AUDITS, mergeAndDeduplicateTasks } from "@/lib/audit";

const FILTERS = [
  { key: "all", label: "Total Audit" },
  { key: "Product", label: "Product" },
  { key: "Process", label: "Process" },
  { key: "Revalidation", label: "Revalidation" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

export const Route = createFileRoute("/_authenticated/audits")({
  validateSearch: (search: Record<string, unknown>): { filter: Filter } => {
    const raw = String(search["filter"] ?? "all");
    const match = FILTERS.find((f) => f.key === raw);
    return { filter: (match?.key ?? "all") as Filter };
  },
  head: () => ({
    meta: [
      { title: "Audit Records — Sakthi Auto" },
      {
        name: "description",
        content: "Browse planned, ongoing and completed audits across the plant.",
      },
      { property: "og:title", content: "Audit Records — Sakthi Auto" },
      { property: "og:description", content: "Filterable register of all plant audits." },
    ],
  }),
  component: AuditsPage,
});

function AuditsPage() {
  const { filter } = Route.useSearch();

  const { data = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_assignments")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [localTasks, setLocalTasks] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_excel_tasks_v8");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = mergeAndDeduplicateTasks(parsed);
            setLocalTasks(clean);
          }
        } catch {}
      }
    }
  }, []);

  const activeDataSet = mergeAndDeduplicateTasks([
    ...(data.length > 0 ? data : DEFAULT_OFFICIAL_AUDITS),
    ...localTasks,
  ]);

  const rows = activeDataSet.filter((r) => {
    if (filter === "all") return true;
    if (filter === "ongoing") return ["Assigned", "In Progress", "Overdue"].includes(r.status);
    if (filter === "completed") return r.status === "Completed" || r.status === "Submitted";
    return r.audit_type === filter;
  });

  return (
    <AppShell
      title="Audit Register"
      description="Every planned, active and completed audit in the current programme."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            to="/audits"
            search={{ filter: f.key }}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "border-brand bg-brand text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-brand hover:text-brand",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Audit code</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Auditor</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/60">
                <td className="px-4 py-3 font-medium text-brand">
                  <Link to="/audit/$auditId" params={{ auditId: r.id }}>
                    {r.audit_code}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.audit_type}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.area}</td>
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
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No audits match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
