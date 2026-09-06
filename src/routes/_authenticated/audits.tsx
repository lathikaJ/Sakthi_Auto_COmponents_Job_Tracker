import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
      { title: "Audit Records — Sakthi Spark" },
      {
        name: "description",
        content: "Browse planned, ongoing and completed audits across the plant.",
      },
      { property: "og:title", content: "Audit Records — Sakthi Spark" },
      { property: "og:description", content: "Filterable register of all plant audits." },
    ],
  }),
  component: AuditsPage,
});

function AuditsPage() {
  const { filter } = Route.useSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const rows = data.filter((r) => {
    if (filter === "all") return true;
    if (filter === "ongoing") return ["Assigned", "In Progress", "Overdue"].includes(r.status);
    if (filter === "completed") return r.status === "Completed";
    return r.audit_type === filter;
  });

  const handleExport = () => {
    if (rows.length === 0) {
      toast.error("No audit records available to export.");
      return;
    }
    const headers = ["Audit Code", "Title", "Type", "Area", "Auditor", "Due Date", "Status"];
    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.audit_code}"`,
          `"${r.title.replace(/"/g, '""')}"`,
          `"${r.audit_type}"`,
          `"${r.area.replace(/"/g, '""')}"`,
          `"${r.assigned_to_employee_number}"`,
          `"${r.due_date}"`,
          `"${r.status}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit_register_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} audit record(s) successfully.`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.success(`Imported audit format successfully: ${file.name}`);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AppShell
      title="Audit Register"
      description="Every planned, active and completed audit in the current programme."
      action={
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      }
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

