import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Package,
  RefreshCcw,
  Timer,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowUpRight,
  FileSpreadsheet,
  FileCheck2,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ExportAuditModal } from "@/components/audit/ExportAuditModal";
import { downloadAssignedAuditExcel } from "@/lib/auditExcelHelper";

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
  const queryClient = useQueryClient();

  const [modalAudit, setModalAudit] = useState<Assignment | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

  const handleOpenExportModal = (row: Assignment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalAudit(row);
    setIsExportModalOpen(true);
  };

  const handleDownloadExcel = (row: Assignment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    downloadAssignedAuditExcel(row);
  };

  if (!isAdmin) {
    const active = rows.filter((r) => r.status !== "Completed" && r.status !== "Submitted" && r.status !== "Under Review");
    const underReview = rows.filter((r) => r.status === "Submitted" || r.status === "Under Review");
    const done = rows.filter((r) => r.status === "Completed");

    return (
      <AppShell
        title={`Welcome, ${profile?.full_name ?? "Auditor"}`}
        description="Your assigned audits for the current period. Download Excel file, complete offline, and click Export to submit result."
      >
        {/* Total Audit Workflow Quick Banner */}
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Total Audit Export Workflow
                </p>
                <p className="text-xs text-emerald-800">
                  Step 1-3: Download assigned Excel → Step 4: Fill & save locally → Step 5-6: Click Export to submit as <strong className="text-emerald-950">OK (attach Excel)</strong> or <strong className="text-rose-950">Deviation (2-page form)</strong>.
                </p>
              </div>
            </div>
            <Button size="sm" asChild variant="outline" className="text-xs border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-100">
              <Link to="/audits" search={{ filter: "all" }}>View Total Audit Register</Link>
            </Button>
          </div>
        </div>

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              Active Work Queue ({active.length})
            </h2>
            {active.length === 0 ? (
              <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
                No open audits assigned to you right now.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((r) => (
                  <QueueCard
                    key={r.id}
                    row={r}
                    onDownload={(e) => handleDownloadExcel(r, e)}
                    onExport={(e) => handleOpenExportModal(r, e)}
                  />
                ))}
              </div>
            )}
          </div>

          {underReview.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                Submitted / Under Admin Review ({underReview.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {underReview.map((r) => (
                  <QueueCard
                    key={r.id}
                    row={r}
                    onDownload={(e) => handleDownloadExcel(r, e)}
                    onExport={(e) => handleOpenExportModal(r, e)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Completed Audits ({done.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {done.map((r) => (
                <QueueCard
                  key={r.id}
                  row={r}
                  onDownload={(e) => handleDownloadExcel(r, e)}
                />
              ))}
            </div>
          </div>
        </section>

        <ExportAuditModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          audit={modalAudit}
          onDownloadExcel={modalAudit ? () => downloadAssignedAuditExcel(modalAudit) : undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["assignments"] });
          }}
        />
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
      key: "under_review",
      label: "Under Review",
      value: rows.filter((r) => ["Submitted", "Under Review"].includes(r.status)).length,
      hint: "Pending admin verification",
      icon: FileCheck2,
    },
    {
      key: "deviation",
      label: "Deviation Audit",
      value: devs.filter((d) => d.status !== "Closed").length,
      hint: "Open non-conformances",
      icon: AlertTriangle,
    },
    {
      key: "completed",
      label: "Completed Audit",
      value: rows.filter((r) => r.status === "Completed").length,
      hint: "Verified historical records",
      icon: CheckCircle2,
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
        {metrics.map((m) => {
          if (m.key === "deviation") {
            return (
              <Link
                key={m.key}
                to="/deviations"
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
            );
          }
          return (
            <Link
              key={m.key}
              to="/audits"
              search={{ filter: m.key as any }}
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
          );
        })}
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent assignments
          </h2>
          <Button variant="link" size="sm" asChild className="text-xs text-brand font-bold p-0">
            <Link to="/audits" search={{ filter: "all" }}>View All Audits →</Link>
          </Button>
        </div>
        <div className="card-elevated overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Audit</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Auditor</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAssignedAuditExcel(r)}
                        className="h-7 px-2 text-xs gap-1 border-slate-300"
                        title="Download assigned Excel template"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-600" />
                        Excel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenExportModal(r)}
                        className="h-7 px-2.5 text-xs font-bold gap-1 bg-brand text-white"
                        title="Export audit result"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Export
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No assignments yet. Create an annual plan, then assign audits by month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ExportAuditModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        audit={modalAudit}
        onDownloadExcel={modalAudit ? () => downloadAssignedAuditExcel(modalAudit) : undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["assignments"] });
        }}
      />
    </AppShell>
  );
}

function QueueCard({
  row,
  onDownload,
  onExport,
}: {
  row: Assignment;
  onDownload?: (e: React.MouseEvent) => void;
  onExport?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="card-elevated flex flex-col justify-between gap-3 p-5 transition-all hover:shadow-lift border border-slate-200">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-brand">{row.audit_code}</p>
            <Link
              to="/audit/$auditId"
              params={{ auditId: row.id }}
              className="font-semibold text-foreground hover:underline text-sm line-clamp-1"
            >
              {row.title}
            </Link>
          </div>
          <StatusBadge status={row.status} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {row.audit_type} audit · {row.area} · Due {row.due_date}
        </p>
      </div>

      {/* Action Buttons for Employee Workflow */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
        <Link
          to="/audit/$auditId"
          params={{ auditId: row.id }}
          className="text-xs font-semibold text-brand hover:underline"
        >
          Open Checklist →
        </Link>

        <div className="flex items-center gap-1.5">
          {onDownload && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownload}
              className="h-7 px-2.5 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              title="Step 2-3: Download assigned Excel file"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              Download
            </Button>
          )}

          {onExport && (
            <Button
              size="sm"
              onClick={onExport}
              className="h-7 px-2.5 text-xs font-bold gap-1 bg-brand hover:bg-brand-hover text-white shadow-xs"
              title="Step 5-6: Submit OK (with Excel) or Deviation"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
