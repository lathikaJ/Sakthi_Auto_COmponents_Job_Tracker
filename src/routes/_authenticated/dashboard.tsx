import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Package,
  RefreshCcw,
  Timer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileCheck2,
  Building2,
  UserCheck,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  FileSpreadsheet,
  Layers,
  Filter,
  Check,
  ArrowRight,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ExcelTaskGrid, ExcelTaskRow } from "@/components/excel/ExcelTaskGrid";
import { EmployeeActivityLogs } from "@/components/admin/EmployeeActivityLogs";
import { SubmittedAuditsRegister } from "@/components/admin/SubmittedAuditsRegister";
import { ElectronicSignatureRegistry } from "@/components/admin/ElectronicSignatureRegistry";
import { JobReviewTab } from "@/components/admin/JobReviewTab";
import { AnalyticsPieChartTab } from "@/components/admin/AnalyticsPieChartTab";
import { EmployeeActivityLogsGrid } from "@/components/admin/EmployeeActivityLogsGrid";

import { DEFAULT_OFFICIAL_AUDITS } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Machine Shop Audit — Sakthi Auto Value Added Engineering" },
      {
        name: "description",
        content: "Machine Shop Audit platform with conditional two-level drill-down interaction mechanism.",
      },
      { property: "og:title", content: "Machine Shop Audit — Sakthi Auto Value Added Engineering" },
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

type Deviation = {
  id: string;
  dev_code?: string;
  status: string;
  description: string;
  observed_condition?: string;
  location_operation?: string;
  created_at: string;
  employee_number: string;
  severity?: string;
};

function DashboardPage() {
  const { isAdmin, profile, loading } = useAuth();

  // State Management
  const [currentView, setCurrentView] = useState<
    "dashboard" | "inside_audits" | "excel_view" | "submitted_audits_page" | "signatures_page" | "activity_logs_page"
  >("dashboard");
  const [selectedAuditType, setSelectedAuditType] = useState<string>("Ongoing Audit");
  const [excelSubTab, setExcelSubTab] = useState<"all" | "Product" | "Revalidation" | "Process">("all");
  const [totalSubSelection, setTotalSubSelection] = useState<"options" | "Product" | "Revalidation" | "Process">("options");
  const [dashboardTab, setDashboardTab] = useState<"overview" | "review_jobs" | "analytics" | "activity_logs">("overview");

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

  const deviationsQuery = useQuery({
    queryKey: ["deviations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_deviations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Deviation[];
    },
  });

  const dbRows = assignments.data ?? [];
  const dbDevs = deviationsQuery.data ?? [];

  const [localExcelTasks, setLocalExcelTasks] = useState<Assignment[]>([]);
  const [localDeviations, setLocalDeviations] = useState<Deviation[]>([]);

  useEffect(() => {
    const loadStored = () => {
      if (typeof window !== "undefined") {
        const storedTasks = localStorage.getItem("sakthi_excel_tasks_v8");
        if (storedTasks) {
          try {
            const parsed = JSON.parse(storedTasks);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLocalExcelTasks(parsed);
            }
          } catch {
            // Ignore
          }
        }

        const storedDevs = localStorage.getItem("sakthi_deviations");
        if (storedDevs) {
          try {
            const parsedDevs = JSON.parse(storedDevs);
            if (Array.isArray(parsedDevs)) {
              setLocalDeviations(parsedDevs);
            }
          } catch {
            // Ignore
          }
        }
      }
    };

    loadStored();
    window.addEventListener("excel_tasks_updated", loadStored);
    window.addEventListener("sakthi_deviations_updated", loadStored);
    return () => {
      window.removeEventListener("excel_tasks_updated", loadStored);
      window.removeEventListener("sakthi_deviations_updated", loadStored);
    };
  }, []);

  const rawTaskRows: Assignment[] = (localExcelTasks.length > 0 ? localExcelTasks : dbRows.length > 0 ? dbRows : DEFAULT_OFFICIAL_AUDITS) as Assignment[];
  const currentEmpNumber = profile?.employee_number;
  const allTaskRows = isAdmin
    ? rawTaskRows
    : rawTaskRows.filter((r) => !currentEmpNumber || r.assigned_to_employee_number === currentEmpNumber);

  const allDeviations: Deviation[] = localDeviations.length > 0 ? localDeviations : dbDevs;

  // Task categories
  const ongoingTasks = allTaskRows.filter(
    (r) => r.status !== "Completed" && r.status !== "Deviation"
  );

  const completedTasks = allTaskRows.filter(
    (r) => r.status === "Completed" || r.status === "Submitted"
  );

  const deviationTaskRows = allTaskRows.filter((r) => r.status === "Deviation");

  const mergedDeviations: Deviation[] = [
    ...allDeviations,
    ...deviationTaskRows
      .filter((t) => !allDeviations.some((d) => d.id === t.id || d.dev_code === t.audit_code))
      .map((t) => ({
        id: t.id,
        dev_code: t.audit_code,
        description: t.title,
        observed_condition: `Non-conformance marked during ${t.audit_type} Audit in ${t.area}`,
        location_operation: t.area,
        employee_number: t.assigned_to_employee_number,
        severity: "High",
        status: "open",
        created_at: t.due_date,
      })),
  ];

  // Audit counts
  const totalAuditCount = allTaskRows.length;
  const ongoingAuditCount = ongoingTasks.length;
  const completedAuditCount = completedTasks.length;
  const deviationAuditCount = mergedDeviations.length;

  // Breakdown lists for Total Audit
  const productAuditsTotal = allTaskRows.filter((r) => r.audit_type === "Product");
  const revalidationAuditsTotal = allTaskRows.filter((r) => r.audit_type === "Revalidation");
  const docAuditsTotal = allTaskRows.filter(
    (r) => r.audit_type === "Process" || r.audit_type === "Doc" || r.audit_type === "Doc Audit" || r.audit_type === "Dock Audit"
  );

  const ongoingProductCount = ongoingTasks.filter((r) => r.audit_type === "Product").length;
  const ongoingRevalidationCount = ongoingTasks.filter((r) => r.audit_type === "Revalidation").length;
  const ongoingDocCount = ongoingTasks.filter(
    (r) => r.audit_type === "Process" || r.audit_type === "Doc" || r.audit_type === "Doc Audit" || r.audit_type === "Dock Audit"
  ).length;

  // Event Handlers
  const handleCardBodyClick = (auditType: string) => {
    setSelectedAuditType(auditType);
    if (auditType === "Ongoing Audit") {
      setExcelSubTab("all");
    } else if (auditType === "Total Audit") {
      setTotalSubSelection("options");
    }
    setCurrentView("inside_audits");
  };

  const handleActionLinkClick = (e: React.MouseEvent, auditType: string) => {
    e.stopPropagation();
    setSelectedAuditType(auditType);
    setExcelSubTab("all");
    setCurrentView("excel_view");
  };

  const handleOpenSpecificOngoingExcel = (subTab: "Product" | "Revalidation" | "Process") => {
    setSelectedAuditType("Ongoing Audit");
    setExcelSubTab(subTab);
    setCurrentView("excel_view");
  };

  const handleResetToDashboard = () => {
    setCurrentView("dashboard");
  };

  // Delete Audit (Admin only)
  const handleDeleteAudit = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only Admin can delete audit records.");
      return;
    }
    const updated = allTaskRows.filter((t) => t.id !== id);
    setLocalExcelTasks(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(updated));
      window.dispatchEvent(new Event("excel_tasks_updated"));
    }
    try {
      await supabase.from("audit_assignments").delete().eq("id", id);
    } catch {}
    toast.info("Audit record removed by Admin.");
  };

  // Delete Deviation Observation (Admin only)
  const handleDeleteDeviation = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only Admin can delete deviation observations.");
      return;
    }
    const updated = localDeviations.filter((d) => d.id !== id);
    setLocalDeviations(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_deviations", JSON.stringify(updated));
      window.dispatchEvent(new Event("sakthi_deviations_updated"));
    }
    toast.info("Deviation observation deleted by Admin.");
  };

  // Filter rows for Excel View
  const getFilteredExcelRows = (): ExcelTaskRow[] => {
    let contextRows: Assignment[] = allTaskRows;

    if (selectedAuditType === "Ongoing Audit") {
      contextRows = ongoingTasks;
    } else if (selectedAuditType === "Completed Audit") {
      contextRows = completedTasks;
    } else if (selectedAuditType === "Deviation Observation" || selectedAuditType === "Deviation Audit") {
      contextRows = allTaskRows.filter((r) => r.status === "Deviation");
    }

    if (excelSubTab === "all") return contextRows;
    if (excelSubTab === "Process") {
      return contextRows.filter(
        (r) => r.audit_type === "Process" || r.audit_type === "Doc" || r.audit_type === "Doc Audit" || r.audit_type === "Dock Audit"
      );
    }
    return contextRows.filter((r) => r.audit_type === excelSubTab);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600 font-medium">
        Loading Audit Management Dashboard…
      </div>
    );
  }

  return (
    <AppShell
      title={`Machine Shop Audit (${isAdmin ? "Admin View" : "Employee View"})`}
      description="Interactive audit control matrix. Click card body for internal breakdown options or blue links for direct Excel access."
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              assignments.refetch();
              deviationsQuery.refetch();
              window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
              window.dispatchEvent(new Event("sakthi_signatures_updated"));
              toast.success("Dashboard data & review queue refreshed successfully!");
            }}
            className="bg-white border-slate-300 text-slate-700 font-bold hover:bg-slate-50 gap-1.5 shadow-2xs text-xs"
            title="Click to refresh live audit matrix, assignments, and submission review queue"
          >
            <RefreshCcw className="h-3.5 w-3.5 text-emerald-600" /> Refresh Data
          </Button>

          {isAdmin && (
            <Button asChild className="bg-brand text-white font-bold hover:bg-brand-hover shadow-sm text-xs">
              <Link to="/assignments">+ New Monthly Assignment</Link>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top-Level Feature Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setDashboardTab("overview")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              dashboardTab === "overview"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Layers className="h-4 w-4" /> {isAdmin ? "Overview & Matrix" : "My Assigned Tasks & Reporting Queue"}
          </button>

          {/* Admin Specialized Features */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setDashboardTab("review_jobs")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                  dashboardTab === "review_jobs"
                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400"
                    : "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Review Jobs Queue</span>
                <span className="rounded-full bg-indigo-700 px-2 py-0.2 text-[10px] font-extrabold text-white">
                  Active
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab("analytics")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                  dashboardTab === "analytics"
                    ? "bg-teal-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Package className="h-4 w-4" /> Analytics Pie Chart (Admin Only)
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab("activity_logs")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                  dashboardTab === "activity_logs"
                    ? "bg-sky-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Calendar className="h-4 w-4" /> All Employee Login & Logout Grid
              </button>
            </>
          )}
        </div>

        {/* Tab 2: Review Jobs (Admin Only) */}
        {isAdmin && dashboardTab === "review_jobs" && (
          <div className="animate-in fade-in duration-200">
            <JobReviewTab isAdmin={isAdmin} />
          </div>
        )}

        {/* Tab 3: Analytics Pie Chart (Admin Only) */}
        {isAdmin && dashboardTab === "analytics" && (
          <div className="animate-in fade-in duration-200">
            <AnalyticsPieChartTab />
          </div>
        )}

        {/* Tab 4: All Employee Logins/Logouts Grid (Admin Only) */}
        {isAdmin && dashboardTab === "activity_logs" && (
          <div className="animate-in fade-in duration-200">
            <EmployeeActivityLogsGrid />
          </div>
        )}

        {/* Tab 1: Main Overview & Matrix */}
        {dashboardTab === "overview" && (
          <div>
            {/* PAGE 1: MAIN DASHBOARD CARDS & SUMMARY VIEW */}
            {currentView === "dashboard" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Instruction Banner */}
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs font-bold text-sky-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-sky-600" /> Interactive Page-by-Page Navigation
                    </p>
                    <p className="text-xs text-sky-700 mt-0.5 font-medium">
                      • Click any audit card container ➔ Moves to <strong>Page 2: Option Boxes & Master Lists</strong><br />
                      • Click blue action links (e.g., <em>Open Excel Grid &gt;</em>) ➔ Moves to <strong>Page 3: Excel Control Sheet Matrix</strong>
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-200/80 px-3 py-1 text-[11px] font-bold text-sky-900">
                    4 Audits Active
                  </span>
                </div>

                {/* ── Main 4 Audit Cards Grid ── */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* CARD 1: TOTAL AUDIT */}
                  <div
                    onClick={() => handleCardBodyClick("Total Audit")}
                    className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-emerald-500 hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          1. Total Audit
                        </span>
                        <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 group-hover:scale-105 transition-transform">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                          {totalAuditCount}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Master options: Product, Reval & Dock Audits
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Card Body: Option Boxes</span>
                      <button
                        type="button"
                        onClick={(e) => handleActionLinkClick(e, "Total Audit")}
                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors"
                      >
                        View Breakdown List &gt;
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: ONGOING AUDIT */}
                  <div
                    onClick={() => handleCardBodyClick("Ongoing Audit")}
                    className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-sky-500 hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          2. Ongoing Audit
                        </span>
                        <div className="rounded-lg bg-sky-100 p-2 text-sky-700 group-hover:scale-105 transition-transform">
                          <Timer className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                          {ongoingAuditCount}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          3 Separate Excel options (Product, Reval, Dock)
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Card Body: Option Boxes</span>
                      <button
                        type="button"
                        onClick={(e) => handleActionLinkClick(e, "Ongoing Audit")}
                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors"
                      >
                        Open Excel Grid &gt;
                      </button>
                    </div>
                  </div>

                  {/* CARD 3: COMPLETED AUDIT */}
                  <div
                    onClick={() => handleCardBodyClick("Completed Audit")}
                    className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-500 hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          3. Completed Audit
                        </span>
                        <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700 group-hover:scale-105 transition-transform">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                          {completedAuditCount}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Verified audit logs & inspector sign-offs
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Card Body: Internal List</span>
                      <button
                        type="button"
                        onClick={(e) => handleActionLinkClick(e, "Completed Audit")}
                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors"
                      >
                        View Completed Logs &gt;
                      </button>
                    </div>
                  </div>

                  {/* CARD 4: DEVIATION OBSERVATION */}
                  <div
                    onClick={() => handleCardBodyClick("Deviation Observation")}
                    className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-amber-500 hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          4. Deviation Observation
                        </span>
                        <div className="rounded-lg bg-amber-100 p-2 text-amber-700 group-hover:scale-105 transition-transform">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                          {deviationAuditCount}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Logged non-conformances & CAPA plans
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Card Body: Internal List</span>
                      <button
                        type="button"
                        onClick={(e) => handleActionLinkClick(e, "Deviation Observation")}
                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors"
                      >
                        Open Deviation Register &gt;
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Admin Quality Tools & Verification Hubs Option Boxes ── */}
                {isAdmin && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" /> Admin Quality Tools & Verification Hubs
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">Click any box to open dedicated full page</span>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      {/* BOX 1: Submitted Audits Register */}
                      <div
                        onClick={() => setCurrentView("submitted_audits_page")}
                        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-emerald-500 hover:shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700 group-hover:scale-105 transition-transform">
                              <FileCheck2 className="h-5 w-5" />
                            </div>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                              Live Register
                            </span>
                          </div>
                          <h4 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            Submitted Audits Register
                          </h4>
                          <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">
                            Track Part No, Part Name, Employee Name & Submitted Date Timestamps.
                          </p>
                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:underline">
                          <span>Open Register Page</span>
                          <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* BOX 2: Electronic Signatures Directory */}
                      <div
                        onClick={() => setCurrentView("signatures_page")}
                        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-sky-500 hover:shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="rounded-lg bg-sky-100 p-2.5 text-sky-700 group-hover:scale-105 transition-transform">
                              <UserCheck className="h-5 w-5" />
                            </div>
                            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 border border-sky-300">
                              10 Personnel
                            </span>
                          </div>
                          <h4 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
                            Electronic Signatures Directory
                          </h4>
                          <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">
                            10 Member transparent PNG signature database & authentication.
                          </p>
                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold text-sky-700 group-hover:underline">
                          <span>Open Signature Page</span>
                          <ArrowRight className="h-4 w-4 text-sky-600 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* BOX 3: Employee Job Review & Verification Queue */}
                      <div
                        onClick={() => setDashboardTab("review_jobs")}
                        className="group cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-xs transition-all hover:border-indigo-500 hover:shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="rounded-lg bg-indigo-600 p-2.5 text-white group-hover:scale-105 transition-transform">
                              <FileText className="h-5 w-5" />
                            </div>
                            <span className="rounded-full bg-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-900 border border-indigo-300">
                              Admin Review
                            </span>
                          </div>
                          <h4 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            Review Jobs Queue
                          </h4>
                          <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">
                            Review employee submitted audits, check evidences & E-Signatures, approve/reject.
                          </p>
                        </div>

                        <div className="mt-5 border-t border-indigo-200 pt-3 flex items-center justify-between text-xs font-bold text-indigo-800 group-hover:underline">
                          <span>Open Review Queue</span>
                          <ArrowRight className="h-4 w-4 text-indigo-700 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* BOX 4: Employee Activity Logs */}
                      <div
                        onClick={() => setCurrentView("activity_logs_page")}
                        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-purple-500 hover:shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="rounded-lg bg-purple-100 p-2.5 text-purple-700 group-hover:scale-105 transition-transform">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 border border-purple-300">
                              Security Trail
                            </span>
                          </div>
                          <h4 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
                            Employee Activity & Login Logs
                          </h4>
                          <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">
                            Complete security log history of employee logins, logouts, and system events.
                          </p>
                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:underline">
                          <span>Open Activity Logs</span>
                          <ArrowRight className="h-4 w-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

        {/* ==================================================================== */}
        {/* VIEW 1.B: DEDICATED PAGE FOR SUBMITTED AUDITS REGISTER               */}
        {/* ==================================================================== */}
        {currentView === "submitted_audits_page" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <button
                type="button"
                onClick={handleResetToDashboard}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Main Dashboard
              </button>
              <span className="text-xs font-bold text-slate-500">
                Admin Feature: Submitted Audits Register Page
              </span>
            </div>
            <SubmittedAuditsRegister />
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 1.C: DEDICATED PAGE FOR ELECTRONIC SIGNATURES DIRECTORY        */}
        {/* ==================================================================== */}
        {currentView === "signatures_page" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <button
                type="button"
                onClick={handleResetToDashboard}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Main Dashboard
              </button>
              <span className="text-xs font-bold text-slate-500">
                Admin Feature: Electronic Signatures Directory Page
              </span>
            </div>
            <ElectronicSignatureRegistry />
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 1.D: DEDICATED PAGE FOR EMPLOYEE ACTIVITY & LOGIN LOGS         */}
        {/* ==================================================================== */}
        {currentView === "activity_logs_page" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <button
                type="button"
                onClick={handleResetToDashboard}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Main Dashboard
              </button>
              <span className="text-xs font-bold text-slate-500">
                Admin Feature: Employee Activity & Login Logs Page
              </span>
            </div>
            <EmployeeActivityLogs />
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: INSIDE AUDITS BREAKDOWN / OPTION BOXES VIEW ('inside_audits') */}
        {/* ==================================================================== */}
        {currentView === "inside_audits" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <button
                type="button"
                onClick={handleResetToDashboard}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Main Dashboard
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Selected Audit Category:</span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                  {selectedAuditType}
                </span>
              </div>
            </div>

            {/* ── ONGOING AUDIT: 3 SEPARATE OPTION BOXES (PRODUCT, REVALIDATION, DOCS) ── */}
            {selectedAuditType === "Ongoing Audit" ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-5">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Timer className="h-5 w-5 text-sky-600" /> Ongoing Audit Excel Options
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Select an audit option below to open its dedicated interactive Excel Spreadsheet matrix.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {/* BOX 1: Product Audit Option Box */}
                  <div
                    onClick={() => handleOpenSpecificOngoingExcel("Product")}
                    className="group cursor-pointer rounded-xl border-2 border-emerald-300 bg-white p-6 shadow-xs hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 group-hover:scale-110 transition-transform">
                          <Package className="h-6 w-6" />
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
                          {ongoingProductCount} Active
                        </span>
                      </div>

                      <h3 className="mt-5 text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        Product Audit
                      </h3>
                      <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                        Open dedicated Product Audit Excel sheet for dimensional, visual, and hardness inspections.
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-bold text-emerald-700 group-hover:underline">
                        Open Product Excel Sheet
                      </span>
                      <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* BOX 2: Revalidation Audit Option Box */}
                  <div
                    onClick={() => handleOpenSpecificOngoingExcel("Revalidation")}
                    className="group cursor-pointer rounded-xl border-2 border-sky-300 bg-white p-6 shadow-xs hover:border-sky-500 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-sky-100 p-3 text-sky-700 group-hover:scale-110 transition-transform">
                          <RefreshCcw className="h-6 w-6" />
                        </div>
                        <span className="rounded-full bg-sky-100 px-3 py-1 font-mono text-xs font-bold text-sky-800">
                          {ongoingRevalidationCount} Active
                        </span>
                      </div>

                      <h3 className="mt-5 text-lg font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
                        Revalidation Audit
                      </h3>
                      <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                        Open dedicated Revalidation Audit Excel sheet for periodic tooling and gauge recalibrations.
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-bold text-sky-700 group-hover:underline">
                        Open Revalidation Excel Sheet
                      </span>
                      <ArrowRight className="h-4 w-4 text-sky-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* BOX 3: Dock Audit Option Box */}
                  <div
                    onClick={() => handleOpenSpecificOngoingExcel("Process")}
                    className="group cursor-pointer rounded-xl border-2 border-indigo-300 bg-white p-6 shadow-xs hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700 group-hover:scale-110 transition-transform">
                          <FileText className="h-6 w-6" />
                        </div>
                        <span className="rounded-full bg-indigo-100 px-3 py-1 font-mono text-xs font-bold text-indigo-800">
                          {ongoingDocCount} Active
                        </span>
                      </div>

                      <h3 className="mt-5 text-lg font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                        Dock Audit
                      </h3>
                      <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                        Open dedicated Dock Audit Excel sheet for process documentation and SOP compliance logs.
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-bold text-indigo-700 group-hover:underline">
                        Open Dock Audit Excel Sheet
                      </span>
                      <ArrowRight className="h-4 w-4 text-indigo-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedAuditType === "Total Audit" ? (
              /* ── TOTAL AUDIT: 3 SEPARATE OPTION BOXES & SPECIFIC BREAKDOWN LISTS ── */
              <div className="space-y-6">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-emerald-600" /> Total Audit Options & Breakdown
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Select an option below to view its detailed master audit list breakdown.
                    </p>
                  </div>

                  {totalSubSelection !== "options" && (
                    <button
                      type="button"
                      onClick={() => setTotalSubSelection("options")}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-500" /> Back to Total Audit Options
                    </button>
                  )}
                </div>

                {totalSubSelection === "options" ? (
                  /* ── TOTAL AUDIT 3 OPTION BOXES ── */
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    {/* OPTION BOX 1: Product Audit */}
                    <div
                      onClick={() => setTotalSubSelection("Product")}
                      className="group cursor-pointer rounded-xl border-2 border-emerald-300 bg-white p-6 shadow-xs hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 group-hover:scale-110 transition-transform">
                            <Package className="h-6 w-6" />
                          </div>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
                            {productAuditsTotal.length} Total
                          </span>
                        </div>

                        <h3 className="mt-5 text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          Product Audit
                        </h3>
                        <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                          View master breakdown list for all Product Audits across plant lines.
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-bold text-emerald-700 group-hover:underline">
                          View Product Breakdown List
                        </span>
                        <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* OPTION BOX 2: Revalidation Audit */}
                    <div
                      onClick={() => setTotalSubSelection("Revalidation")}
                      className="group cursor-pointer rounded-xl border-2 border-sky-300 bg-white p-6 shadow-xs hover:border-sky-500 hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="rounded-xl bg-sky-100 p-3 text-sky-700 group-hover:scale-110 transition-transform">
                            <RefreshCcw className="h-6 w-6" />
                          </div>
                          <span className="rounded-full bg-sky-100 px-3 py-1 font-mono text-xs font-bold text-sky-800">
                            {revalidationAuditsTotal.length} Total
                          </span>
                        </div>

                        <h3 className="mt-5 text-lg font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
                          Revalidation Audit
                        </h3>
                        <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                          View master breakdown list for all periodic Revalidation Audits.
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-bold text-sky-700 group-hover:underline">
                          View Revalidation Breakdown List
                        </span>
                        <ArrowRight className="h-4 w-4 text-sky-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* OPTION BOX 3: Dock Audit */}
                    <div
                      onClick={() => setTotalSubSelection("Process")}
                      className="group cursor-pointer rounded-xl border-2 border-indigo-300 bg-white p-6 shadow-xs hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700 group-hover:scale-110 transition-transform">
                            <FileText className="h-6 w-6" />
                          </div>
                          <span className="rounded-full bg-indigo-100 px-3 py-1 font-mono text-xs font-bold text-indigo-800">
                            {docAuditsTotal.length} Total
                          </span>
                        </div>

                        <h3 className="mt-5 text-lg font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          Dock Audit
                        </h3>
                        <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                          View master breakdown list for all Process & Dock Audits.
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-bold text-indigo-700 group-hover:underline">
                          View Dock Audit Breakdown List
                        </span>
                        <ArrowRight className="h-4 w-4 text-indigo-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── SPECIFIC STATIC BREAKDOWN LIST ── */
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        {totalSubSelection === "Product" ? (
                          <Package className="h-5 w-5 text-emerald-600" />
                        ) : totalSubSelection === "Revalidation" ? (
                          <RefreshCcw className="h-5 w-5 text-sky-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-indigo-600" />
                        )}
                        Total {totalSubSelection === "Process" ? "Dock" : totalSubSelection} Audit Master List
                      </h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                        {totalSubSelection === "Product"
                          ? productAuditsTotal.length
                          : totalSubSelection === "Revalidation"
                          ? revalidationAuditsTotal.length
                          : docAuditsTotal.length}{" "}
                        items
                      </span>
                    </div>

                    {/* QF/08/CQA-10 Product Audit Plan Legend Card */}
                    {totalSubSelection === "Product" && (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                          <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-emerald-700" />
                            PRODUCT AUDIT PLAN [MACHINING] — Doc No: QF/08/CQA-10 (Rev.No: 02 dt 12.06.2026)
                          </span>
                          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                            Ref Checklist: QF/08/CQA-09
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-[11px] font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-emerald-200 shadow-2xs">
                            <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-white" />
                            <span>PLAN (Scheduled)</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-emerald-200 shadow-2xs">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                            <span>PLANNED AUDIT DONE (Ref QF/08/CQA-09)</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-emerald-200 shadow-2xs">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                            <span>PLANNED AUDIT NOT CHECKED</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-emerald-200 shadow-2xs">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                            <span>PLANNED NOT AVAILABLE</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-emerald-200 shadow-2xs">
                            <span className="h-2.5 w-2.5 rounded-none rotate-45 bg-amber-500" />
                            <span>UNPLANNED INCLUDED</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-emerald-200 shadow-2xs">
                            <span className="h-2.5 w-2.5 rounded-none rotate-45 bg-sky-600" />
                            <span>UNPLANNED AUDIT DONE</span>
                          </div>
                        </div>

                        <p className="text-[10px] font-mono text-emerald-900 pt-1">
                          Approval Track: <strong>PREPARED BY</strong> ➔ <strong>TEAM LEADER AUDIT</strong> ➔ <strong>APPROVED BY QUALITY HEAD</strong>
                        </p>
                      </div>
                    )}

                    {/* QF/08/CQA-31 Revalidation Plan Schedule Card */}
                    {totalSubSelection === "Revalidation" && (
                      <div className="rounded-xl border border-sky-300 bg-sky-50/60 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 pb-2">
                          <span className="text-xs font-extrabold text-sky-900 flex items-center gap-1.5">
                            <RefreshCcw className="h-4 w-4 text-sky-700" />
                            REVALIDATION PLAN [MACHINING] — Doc No: QF/08/CQA-31 (Rev.No: 02 dt 01.01.2025/2026)
                          </span>
                          <span className="text-[11px] font-mono font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded border border-sky-300">
                            Customer: MAHINDRA & MAHINDRA LTD
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-[11px] font-semibold text-slate-800">
                          <div className="bg-white p-2 rounded border border-sky-200 shadow-2xs">
                            <span className="font-bold text-sky-900">MPV Housing</span>: <span className="font-mono text-brand">Jan & Jul</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-sky-200 shadow-2xs">
                            <span className="font-bold text-sky-900">Bolero Knuckle</span>: <span className="font-mono text-brand">May & Nov</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-sky-200 shadow-2xs">
                            <span className="font-bold text-sky-900">IFS (W501/3G ECO)</span>: <span className="font-mono text-brand">May & Nov</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-sky-200 shadow-2xs">
                            <span className="font-bold text-sky-900">Disc Brake</span>: <span className="font-mono text-brand">Feb & Aug</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-sky-200 shadow-2xs">
                            <span className="font-bold text-sky-900">Bolero Passenger (NABS)</span>: <span className="font-mono text-brand">Apr & Oct</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-sky-200 shadow-2xs">
                            <span className="font-bold text-sky-900">Bolero Passenger (ABS)</span>: <span className="font-mono text-brand">Feb & Aug</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full border-collapse text-left text-xs font-sans">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                            <th className="p-3 w-28 font-bold">Code</th>
                            <th className="p-3 min-w-[220px] font-bold">Title</th>
                            <th className="p-3 w-28 font-bold">Type</th>
                            <th className="p-3 w-32 font-bold">Plant Area</th>
                            <th className="p-3 w-28 font-bold">Assigned Emp</th>
                            <th className="p-3 w-28 font-bold">Status</th>
                            <th className="p-3 text-center w-32 font-bold">Inspection Link</th>
                            {isAdmin && <th className="p-3 text-center w-16 font-bold">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-900">
                          {(totalSubSelection === "Product"
                            ? productAuditsTotal
                            : totalSubSelection === "Revalidation"
                            ? revalidationAuditsTotal
                            : docAuditsTotal
                          ).map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono font-bold text-brand">
                                <Link
                                  to="/audit/$auditId"
                                  params={{ auditId: item.id.startsWith("temp-") ? "aud-msil-01" : item.id.toLowerCase() }}
                                  className="hover:underline hover:text-orange-600 inline-flex items-center gap-1"
                                >
                                  {item.audit_code}
                                </Link>
                              </td>
                              <td className="p-3 font-bold text-slate-900">
                                <Link
                                  to="/audit/$auditId"
                                  params={{ auditId: item.id.startsWith("temp-") ? "aud-msil-01" : item.id.toLowerCase() }}
                                  className="hover:text-sky-600 hover:underline"
                                >
                                  {item.title}
                                </Link>
                              </td>
                              <td className="p-3 font-semibold text-slate-700">{item.audit_type}</td>
                              <td className="p-3 font-semibold text-slate-700">{item.area}</td>
                              <td className="p-3 font-mono font-bold text-slate-800">
                                Emp #{item.assigned_to_employee_number}
                              </td>
                              <td className="p-3">
                                <StatusBadge status={item.status} />
                              </td>
                              <td className="p-3 text-center">
                                <Link
                                  to="/audit/$auditId"
                                  params={{ auditId: item.id.startsWith("temp-") ? "aud-msil-01" : item.id.toLowerCase() }}
                                  className="inline-flex items-center gap-1 rounded bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors shadow-2xs"
                                >
                                  Open Audit &gt;
                                </Link>
                              </td>
                              {isAdmin && (
                                <td className="p-3 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-600 hover:bg-rose-100"
                                    onClick={() => handleDeleteAudit(item.id)}
                                    title="Delete Audit (Admin Only)"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}

                          {(totalSubSelection === "Product"
                            ? productAuditsTotal
                            : totalSubSelection === "Revalidation"
                            ? revalidationAuditsTotal
                            : docAuditsTotal
                          ).length === 0 && (
                            <tr>
                              <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-xs font-medium text-slate-500">
                                No records found for this audit type.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedAuditType === "Completed Audit" ? (
              /* ── COMPLETED AUDIT LIST ── */
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full border-collapse text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                      <th className="p-3 w-28 font-bold">Audit Code</th>
                      <th className="p-3 min-w-[220px] font-bold">Audit Title</th>
                      <th className="p-3 w-28 font-bold">Type</th>
                      <th className="p-3 w-32 font-bold">Plant Area</th>
                      <th className="p-3 w-28 font-bold">Assigned Emp</th>
                      <th className="p-3 w-28 font-bold">Status</th>
                      <th className="p-3 text-center w-32 font-bold">Inspection Link</th>
                      {isAdmin && <th className="p-3 text-center w-16 font-bold">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900">
                    {completedTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          <Link
                            to="/audit/$auditId"
                            params={{ auditId: task.id.startsWith("temp-") ? "aud-msil-01" : task.id.toLowerCase() }}
                            className="hover:underline hover:text-emerald-900"
                          >
                            {task.audit_code}
                          </Link>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <Link
                            to="/audit/$auditId"
                            params={{ auditId: task.id.startsWith("temp-") ? "aud-msil-01" : task.id.toLowerCase() }}
                            className="hover:text-emerald-800 hover:underline"
                          >
                            {task.title}
                          </Link>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{task.audit_type}</td>
                        <td className="p-3 font-semibold text-slate-700">{task.area}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">Emp #{task.assigned_to_employee_number}</td>
                        <td className="p-3">
                          <StatusBadge status="Completed" />
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            to="/audit/$auditId"
                            params={{ auditId: task.id.startsWith("temp-") ? "aud-msil-01" : task.id.toLowerCase() }}
                            className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
                          >
                            Open Audit &gt;
                          </Link>
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:bg-rose-100"
                              onClick={() => handleDeleteAudit(task.id)}
                              title="Delete Audit (Admin Only)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {completedTasks.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-xs font-medium text-slate-500">
                          No completed audits.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── DEVIATION OBSERVATION LIST ── */
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full border-collapse text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                      <th className="p-3 w-28 font-bold">Dev Code</th>
                      <th className="p-3 min-w-[240px] font-bold">Description</th>
                      <th className="p-3 w-36 font-bold">Area</th>
                      <th className="p-3 w-28 font-bold">Severity</th>
                      <th className="p-3 w-28 font-bold">Assigned Emp</th>
                      <th className="p-3 w-28 font-bold">Status</th>
                      {isAdmin && <th className="p-3 text-center w-16 font-bold">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900">
                    {mergedDeviations.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-700">{dev.dev_code || dev.id}</td>
                        <td className="p-3 font-bold text-slate-900">{dev.description}</td>
                        <td className="p-3 font-semibold text-slate-700">{dev.location_operation || "Plant Line"}</td>
                        <td className="p-3 font-bold text-rose-700">{dev.severity || "High"}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">Emp #{dev.employee_number}</td>
                        <td className="p-3">
                          <span className="rounded border bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border-amber-300">
                            {dev.status || "open"}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:bg-rose-100"
                              onClick={() => handleDeleteDeviation(dev.id)}
                              title="Delete Deviation Observation (Admin Only)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {mergedDeviations.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-xs font-medium text-slate-500">
                          No deviations reported.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 3: EXCEL GRID VIEW ('excel_view')                                */}
        {/* ==================================================================== */}
        {currentView === "excel_view" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetToDashboard}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView("inside_audits")}
                  className="flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-sky-600" /> Back to Option Boxes
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Excel Grid Context:</span>
                <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-bold text-white">
                  {selectedAuditType} {excelSubTab !== "all" ? `(${excelSubTab === "Process" ? "Dock" : excelSubTab})` : ""}
                </span>
              </div>

              {/* Excel Sub Tab Filter */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button
                  onClick={() => setExcelSubTab("all")}
                  className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                    excelSubTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setExcelSubTab("Product")}
                  className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                    excelSubTab === "Product" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600"
                  }`}
                >
                  Product
                </button>
                <button
                  onClick={() => setExcelSubTab("Revalidation")}
                  className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                    excelSubTab === "Revalidation" ? "bg-sky-600 text-white shadow-xs" : "text-slate-600"
                  }`}
                >
                  Revalidation
                </button>
                <button
                  onClick={() => setExcelSubTab("Process")}
                  className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                    excelSubTab === "Process" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600"
                  }`}
                >
                  Dock
                </button>
              </div>
            </div>

            {/* Embedded Excel Grid */}
            <ExcelTaskGrid
              initialRows={getFilteredExcelRows()}
              isAdmin={isAdmin}
              currentEmployeeNumber={profile?.employee_number || "690867"}
              title={`Excel Control Sheet — ${selectedAuditType} ${excelSubTab !== "all" ? `(${excelSubTab === "Process" ? "Dock Audit" : excelSubTab + " Audit"})` : ""}`}
              description="Live editable spreadsheet layout. Double-click or click cells to update task details, statuses, add rows, or import/export."
              onRefresh={() => assignments.refetch()}
            />
          </div>
        )}
      </div>
    )}
      </div>
    </AppShell>
  );
}
