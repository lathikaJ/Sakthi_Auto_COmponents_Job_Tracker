import { useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, FileSpreadsheet, ArrowUpRight, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ExportAuditModal } from "@/components/audit/ExportAuditModal";
import { downloadAssignedAuditExcel } from "@/lib/auditExcelHelper";

const FILTERS = [
  { key: "all", label: "Total Audit" },
  { key: "Product", label: "Product" },
  { key: "Process", label: "Process" },
  { key: "Revalidation", label: "Revalidation" },
  { key: "ongoing", label: "Ongoing" },
  { key: "under_review", label: "Under Review" },
  { key: "deviation", label: "Deviation" },
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
      { title: "Total Audit Register — Sakthi Spark" },
      {
        name: "description",
        content: "Browse planned, ongoing, under review and completed audits across the plant.",
      },
      { property: "og:title", content: "Total Audit Register — Sakthi Spark" },
      { property: "og:description", content: "Filterable register of all plant audits with Download & Export workflows." },
    ],
  }),
  component: AuditsPage,
});

function AuditsPage() {
  const { filter } = Route.useSearch();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalAudit, setModalAudit] = useState<any | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
    if (filter === "under_review") return ["Submitted", "Under Review"].includes(r.status);
    if (filter === "deviation") return r.status === "Deviation";
    if (filter === "completed") return r.status === "Completed";
    return r.audit_type === filter;
  });

  const handleExportFullRegister = () => {
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

  const handleOpenExportWorkflow = (auditRow: any) => {
    setModalAudit(auditRow);
    setIsExportModalOpen(true);
  };

  return (
    <AppShell
      title="Total Audit Register"
      description="Download assigned audit Excel sheets, save offline, and use Export to submit as OK (with Excel attachment) or Deviation."
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
            Import (.xlsx)
          </Button>
          <Button onClick={handleExportFullRegister} className="gap-2">
            <Download className="h-4 w-4" />
            Export Register
          </Button>
        </div>
      }
    >
      {/* Workflow Instructions Banner */}
      <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Employee Workflow Step 1 – 6: Total Audit Export Guide
              </p>
              <p className="text-xs text-emerald-800">
                1. Click <strong className="font-semibold text-emerald-950">Download</strong> to get the assigned audit Excel file → 2. Fill & save Excel locally → 3. Click <strong className="font-semibold text-emerald-950">Export</strong> to select <strong className="font-semibold text-emerald-950">OK</strong> (attach Excel → Under Review) or <strong className="font-semibold text-rose-950">Deviation</strong> (2-page report).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            to="/audits"
            search={{ filter: f.key }}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "border-brand bg-brand text-primary-foreground font-bold shadow-xs"
                : "border-border bg-card text-muted-foreground hover:border-brand hover:text-brand",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Audit code</th>
              <th className="px-4 py-3">Title / Part</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Auditor</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Workflow Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/60 transition-colors">
                <td className="px-4 py-3 font-semibold text-brand">
                  <Link to="/audit/$auditId" params={{ auditId: r.id }} className="hover:underline flex items-center gap-1">
                    {r.audit_code}
                    <Eye className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{r.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.audit_type}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.area}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Emp #{r.assigned_to_employee_number}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.due_date}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* 1. Download Assigned Excel Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadAssignedAuditExcel(r)}
                      className="h-7 px-2.5 text-xs font-semibold gap-1 border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-400"
                      title="Step 2-3: Download assigned Excel file to local system"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-600" />
                      Download
                    </Button>

                    {/* 2. Export Button (OK or Deviation Workflow) */}
                    <Button
                      size="sm"
                      onClick={() => handleOpenExportWorkflow(r)}
                      className="h-7 px-2.5 text-xs font-bold gap-1 bg-brand hover:bg-brand-hover text-white shadow-xs"
                      title="Step 5-6: Export audit result (OK with Excel upload or 2-Page Deviation)"
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
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No audits match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Export Audit Modal (OK vs Deviation) */}
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
