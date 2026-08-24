import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Layers,
  Filter,
  Check,
  Trash2,
  Plus,
  Upload,
  Download,
  Search,
  File,
  Edit2,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { JobReviewTab } from "@/components/admin/JobReviewTab";
import { EmployeeActivityLogsGrid } from "@/components/admin/EmployeeActivityLogsGrid";
import {
  DEFAULT_OFFICIAL_AUDITS,
  MONTHS,
  LowProductionRecord,
  DEFAULT_LOW_PRODUCTION_DATA,
  AuditDocument,
} from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Audit Dashboard — Sakthi Auto Value Added Engineering" },
      {
        name: "description",
        content: "Product Audit, Revalidation Audit, and Dock Audit management dashboard with live status monitoring.",
      },
      { property: "og:title", content: "Audit Dashboard — Sakthi Auto Value Added Engineering" },
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
  auditor_name?: string;
  department?: string;
  part_number?: string;
  product_name?: string;
  planned_date?: string;
  start_date_time?: string;
  completion_date?: string;
  progress_pct?: number;
  final_result?: string;
  document_url?: string;
};

type Deviation = {
  id: string;
  dev_code?: string;
  audit_id?: string;
  status: string;
  description: string;
  observed_condition?: string;
  location_operation?: string;
  created_at: string;
  employee_number: string;
  severity?: string;
  responsible_person?: string;
  department?: string;
  corrective_action?: string;
  due_date?: string;
  closure_status?: string;
  product_part_number?: string;
};

export function DashboardPage() {
  const { isAdmin, profile, loading } = useAuth();
  const excelImportInputRef = useRef<HTMLInputElement>(null);

  // Navigation State according to Requirements
  // Level 1: Audit Category (Product Audit | Revalidation Audit | Dock Audit)
  const [selectedCategory, setSelectedCategory] = useState<"Product Audit" | "Revalidation Audit" | "Dock Audit">("Product Audit");

  // Level 2: Audit Status View (Audit Plan | Ongoing | Audit Completed | Deviation | Low Production)
  const [selectedStatusView, setSelectedStatusView] = useState<"Audit Plan" | "Ongoing" | "Audit Completed" | "Deviation" | "Low Production">("Audit Plan");

  // Level 3: Audit Plan Sub-Views (One Year Plan | As-on-Month Plan | Current Month Plan)
  const [selectedPlanSubView, setSelectedPlanSubView] = useState<"One Year Plan" | "As-on-Month Plan" | "Current Month Plan">("One Year Plan");

  // Month selector for As-on-Month Plan (1-12)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Top Admin Tabs ("overview" | "review_jobs" | "activity_logs")
  const [dashboardTab, setDashboardTab] = useState<"overview" | "review_jobs" | "activity_logs">("overview");

  // Modals for Admin Functions
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocAudit, setSelectedDocAudit] = useState<Assignment | null>(null);
  const [docFileUrlInput, setDocFileUrlInput] = useState("");
  const [docNameInput, setDocNameInput] = useState("");

  // Edit / Reschedule Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<Assignment | null>(null);

  // Queries for DB data
  const assignmentsQuery = useQuery({
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

  const dbRows = assignmentsQuery.data ?? [];
  const dbDevs = deviationsQuery.data ?? [];

  const [localExcelTasks, setLocalExcelTasks] = useState<Assignment[]>([]);
  const [localDeviations, setLocalDeviations] = useState<Deviation[]>([]);
  const [localLowProd, setLocalLowProd] = useState<LowProductionRecord[]>(DEFAULT_LOW_PRODUCTION_DATA);
  const [documentsMap, setDocumentsMap] = useState<Record<string, AuditDocument[]>>({});

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

        const storedDocs = localStorage.getItem("sakthi_audit_docs");
        if (storedDocs) {
          try {
            const parsedDocs = JSON.parse(storedDocs);
            setDocumentsMap(parsedDocs);
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

  // Helper matching Audit Type to Category
  const matchesCategory = (type: string, cat: "Product Audit" | "Revalidation Audit" | "Dock Audit") => {
    if (cat === "Product Audit") return type === "Product";
    if (cat === "Revalidation Audit") return type === "Revalidation";
    if (cat === "Dock Audit") return type === "Process" || type === "Doc" || type === "Doc Audit" || type === "Dock Audit";
    return false;
  };

  // Filter tasks by selected audit category
  const categoryTasks = useMemo(() => {
    return allTaskRows.filter((r) => matchesCategory(r.audit_type, selectedCategory));
  }, [allTaskRows, selectedCategory]);

  // Counts for 5 status options under the selected category
  const planTasks = useMemo(() => {
    return categoryTasks.filter((r) => r.status === "Planned" || r.status === "Assigned" || r.status === "Pending");
  }, [categoryTasks]);

  const ongoingTasks = useMemo(() => {
    return categoryTasks.filter((r) => r.status === "In Progress" || r.status === "Ongoing");
  }, [categoryTasks]);

  const completedTasks = useMemo(() => {
    return categoryTasks.filter((r) => r.status === "Completed" || r.status === "Submitted");
  }, [categoryTasks]);

  const deviationTasks = useMemo(() => {
    const taskDevs = categoryTasks.filter((r) => r.status === "Deviation");
    const merged: Deviation[] = [
      ...allDeviations.filter((d) => {
        const matchingTask = allTaskRows.find((t) => t.id === d.audit_id || t.audit_code === d.dev_code);
        return matchingTask ? matchesCategory(matchingTask.audit_type, selectedCategory) : true;
      }),
      ...taskDevs.map((t) => ({
        id: t.id,
        audit_id: t.id,
        dev_code: t.audit_code,
        description: t.title,
        observed_condition: `Non-conformance identified during ${t.audit_type} Audit`,
        location_operation: t.area,
        employee_number: t.assigned_to_employee_number,
        severity: "High",
        status: "Open",
        created_at: t.due_date,
        responsible_person: t.assigned_to_employee_number,
        department: t.area,
        corrective_action: "Action Assigned to QA Engineer",
        due_date: t.due_date,
        closure_status: "Open",
        product_part_number: t.audit_code,
      })),
    ];
    return merged;
  }, [categoryTasks, allDeviations, allTaskRows, selectedCategory]);

  const categoryLowProd = useMemo(() => {
    return localLowProd.filter((l) => {
      if (selectedCategory === "Product Audit") return l.audit_type === "Product";
      if (selectedCategory === "Revalidation Audit") return l.audit_type === "Revalidation";
      if (selectedCategory === "Dock Audit") return l.audit_type === "Dock Audit";
      return true;
    });
  }, [localLowProd, selectedCategory]);

  // Excel Export Handler for All Audits / Current View
  const handleExportCurrentViewExcel = () => {
    let exportData: any[] = [];
    const dateTag = new Date().toISOString().split("T")[0] ?? "";
    const fileName = `Sakthi_Auto_${selectedCategory.replace(/\s+/g, "_")}_${selectedStatusView.replace(/\s+/g, "_")}_${dateTag}.xlsx`;

    if (selectedStatusView === "Audit Plan") {
      const list = categoryTasks.filter((r) => {
        if (selectedPlanSubView === "As-on-Month Plan") return r.month === selectedMonth;
        if (selectedPlanSubView === "Current Month Plan") return r.month === new Date().getMonth() + 1;
        return true;
      });
      exportData = list.map((task, idx) => ({
        "SL. NO.": idx + 1,
        "Audit ID": task.audit_code,
        "Audit Category": selectedCategory,
        "Audit Type": task.audit_type,
        "Product / Part Name": task.title,
        "Part Number": task.audit_code,
        "Planned Date": task.due_date,
        "Auditor": task.auditor_name ?? task.assigned_to_employee_number,
        "Department": task.area,
        "Status": task.status,
      }));
    } else if (selectedStatusView === "Ongoing") {
      exportData = ongoingTasks.map((task, idx) => ({
        "SL. NO.": idx + 1,
        "Audit ID": task.audit_code,
        "Audit Category": selectedCategory,
        "Product / Part Number": task.title,
        "Start Date & Time": task.start_date_time ?? `${task.due_date} 09:00 AM`,
        "Auditor": task.auditor_name ?? task.assigned_to_employee_number,
        "Progress %": `${task.progress_pct ?? 60}%`,
        "Status": task.status,
      }));
    } else if (selectedStatusView === "Audit Completed") {
      exportData = completedTasks.map((task, idx) => ({
        "SL. NO.": idx + 1,
        "Audit ID": task.audit_code,
        "Audit Category": selectedCategory,
        "Product / Part Number": task.title,
        "Audit Date": task.due_date,
        "Auditor": task.auditor_name ?? task.assigned_to_employee_number,
        "Completion Date": task.completion_date ?? task.due_date,
        "Final Result": task.final_result ?? "PASS / COMPLIANT",
      }));
    } else if (selectedStatusView === "Deviation") {
      exportData = deviationTasks.map((dev, idx) => ({
        "SL. NO.": idx + 1,
        "Deviation ID": dev.dev_code ?? dev.id.slice(0, 8),
        "Audit ID": dev.audit_id ?? "AUD-MSIL-01",
        "Product / Part Number": dev.product_part_number ?? "0401DAA02010N",
        "Deviation Description": dev.description,
        "Severity": dev.severity ?? "High",
        "Responsible Person": dev.responsible_person ?? dev.employee_number,
        "Department": dev.department ?? "QA",
        "Corrective Action": dev.corrective_action ?? "Under Review",
        "Due Date": dev.due_date ?? dev.created_at,
        "Closure Status": dev.closure_status ?? dev.status,
      }));
    } else if (selectedStatusView === "Low Production") {
      exportData = categoryLowProd.map((lp, idx) => ({
        "SL. NO.": idx + 1,
        "Part Number": lp.part_number,
        "Product Name": lp.product_name,
        "Audit Type": lp.audit_type,
        "Planned Production (PCS)": lp.planned_production,
        "Actual Production (PCS)": lp.actual_production,
        "Production %": `${lp.production_percentage.toFixed(1)}%`,
        "Threshold %": `${lp.threshold_percentage}%`,
        "Status": lp.status,
      }));
    }

    if (exportData.length === 0) {
      toast.error("No audit records available in this view to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedStatusView);
    XLSX.writeFile(workbook, fileName);
    toast.success(`Exported ${exportData.length} ${selectedCategory} records to ${fileName}!`);
  };

  // Excel Import Handler for All Audits
  const handleTriggerImportExcel = () => {
    if (excelImportInputRef.current) {
      excelImportInputRef.current.value = "";
      excelImportInputRef.current.click();
    }
  };

  const handleImportExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        if (!wsname) return;
        const ws = wb.Sheets[wsname];
        if (!ws) return;
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          toast.error("The uploaded Excel file contains no valid rows.");
          return;
        }

        const today = new Date().toISOString().split("T")[0] ?? "";
        const defaultCatType = selectedCategory === "Dock Audit" ? "Dock Audit" : selectedCategory.split(" ")[0] ?? "Product";

        const importedTasks: Assignment[] = data.map((item: any, idx: number) => {
          const auditCode = String(item["Audit ID"] || item["Audit Code"] || item["Part Number"] || `AUD-${Math.floor(1000 + Math.random() * 9000)}`);
          const title = String(item["Product / Part Name"] || item["Product / Part Number"] || item["Task Title"] || item["Product Name"] || "Imported Audit Record");

          return {
            id: `imp-${Date.now()}-${idx}`,
            audit_code: auditCode,
            title: title,
            audit_type: String(item["Audit Type"] || defaultCatType),
            area: String(item["Department"] || item["Area"] || "Machine Shop Line 1"),
            month: Number(item["Month"]) || selectedMonth,
            year: new Date().getFullYear(),
            due_date: String(item["Planned Date"] || item["Due Date"] || today),
            status: String(item["Status"] || "Planned"),
            assigned_to_employee_number: String(item["Auditor"] || item["Employee ID"] || profile?.employee_number || "688079"),
            auditor_name: String(item["Auditor"] || profile?.full_name || "Lead Auditor"),
          };
        });

        const updated = [...importedTasks, ...rawTaskRows];
        setLocalExcelTasks(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(updated));
          window.dispatchEvent(new Event("excel_tasks_updated"));
        }
        toast.success(`Imported ${importedTasks.length} audit records into ${selectedCategory}!`);
      } catch (err) {
        toast.error("Failed to parse Excel file. Please ensure valid file format (.xlsx, .xls, .csv).");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Admin Actions
  const handleSaveAuditRecord = (updated: Assignment) => {
    const list = rawTaskRows.map((t) => (t.id === updated.id ? updated : t));
    if (!list.some((t) => t.id === updated.id)) {
      list.push(updated);
    }
    setLocalExcelTasks(list);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(list));
      window.dispatchEvent(new Event("excel_tasks_updated"));
    }
    toast.success("Audit plan record saved successfully.");
    setIsEditModalOpen(false);
    setIsAddPlanModalOpen(false);
  };

  const handleDeleteAuditRecord = (id: string) => {
    if (!isAdmin) {
      toast.error("Only authorized Admin can remove audit plans.");
      return;
    }
    const updated = rawTaskRows.filter((t) => t.id !== id);
    setLocalExcelTasks(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(updated));
      window.dispatchEvent(new Event("excel_tasks_updated"));
    }
    toast.info("Audit plan record removed by Admin.");
  };

  const handleAddDocument = () => {
    if (!selectedDocAudit) return;
    if (!docNameInput || !docFileUrlInput) {
      toast.error("Please enter both Document Name and File URL / Path.");
      return;
    }
    const dateStr = new Date().toISOString().split("T")[0] ?? "";
    const newDoc: AuditDocument = {
      id: `doc-${Date.now()}`,
      audit_id: selectedDocAudit.id,
      document_name: docNameInput,
      document_type: "PDF / Spec Document",
      uploaded_by: profile?.full_name ?? "Admin",
      uploaded_at: dateStr,
      url: docFileUrlInput,
    };
    const updatedMap = { ...documentsMap };
    const docArr = updatedMap[selectedDocAudit.id] ?? [];
    docArr.push(newDoc);
    updatedMap[selectedDocAudit.id] = docArr;
    setDocumentsMap(updatedMap);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_audit_docs", JSON.stringify(updatedMap));
    }
    setDocNameInput("");
    setDocFileUrlInput("");
    toast.success("Audit document attached successfully!");
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
      title="Audit Dashboard"
      description="Touch-friendly dashboard for Product Audit, Revalidation Audit, and Dock Audit with live status monitoring."
      action={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden File Input for Excel Import */}
          <input
            type="file"
            ref={excelImportInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcelFile}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              assignmentsQuery.refetch();
              deviationsQuery.refetch();
              window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
              window.dispatchEvent(new Event("sakthi_signatures_updated"));
              toast.success("Dashboard data refreshed.");
            }}
            className="bg-white border-slate-300 text-slate-700 font-bold hover:bg-slate-50 gap-1.5 shadow-2xs text-xs"
          >
            <RefreshCcw className="h-3.5 w-3.5 text-emerald-600" /> Refresh Data
          </Button>

          {/* EXCEL IMPORT BUTTON */}
          <Button
            type="button"
            onClick={handleTriggerImportExcel}
            className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs text-xs gap-1.5"
            title="Import audits from Excel spreadsheet (.xlsx, .csv)"
          >
            <Upload className="h-3.5 w-3.5" /> Import Excel
          </Button>

          {/* EXCEL EXPORT BUTTON */}
          <Button
            type="button"
            onClick={handleExportCurrentViewExcel}
            className="bg-sky-700 text-white font-bold hover:bg-sky-800 shadow-xs text-xs gap-1.5"
            title="Export currently displayed audit records to Excel (.xlsx)"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>

          {isAdmin && (
            <Button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split("T")[0] ?? "";
                const catPrefix = selectedCategory.split(" ")[0] ?? "Product";
                setEditingAudit({
                  id: `aud-${Date.now()}`,
                  audit_code: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
                  title: "New Scheduled Audit Plan",
                  audit_type: selectedCategory === "Dock Audit" ? "Dock Audit" : catPrefix,
                  area: "Machine Shop Line 1",
                  month: selectedMonth,
                  year: new Date().getFullYear(),
                  due_date: today,
                  status: "Planned",
                  assigned_to_employee_number: profile?.employee_number ?? "688079",
                  auditor_name: profile?.full_name ?? "Lead Auditor",
                  department: "Quality Assurance",
                });
                setIsAddPlanModalOpen(true);
              }}
              className="bg-brand text-white font-bold hover:bg-brand-hover shadow-sm text-xs gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Audit Plan
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top-Level Admin Navigation Tabs */}
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
            <Layers className="h-4 w-4" /> Audit Categories & Status Dashboard
          </button>

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
                <Calendar className="h-4 w-4" /> Employee Login & Logout Register
              </button>
            </>
          )}
        </div>

        {/* Tab: Review Jobs Queue (Admin Only) */}
        {isAdmin && dashboardTab === "review_jobs" && (
          <div className="animate-in fade-in duration-200">
            <JobReviewTab isAdmin={isAdmin} />
          </div>
        )}

        {/* Tab: Employee Login Register (Admin Only) */}
        {isAdmin && dashboardTab === "activity_logs" && (
          <div className="animate-in fade-in duration-200">
            <EmployeeActivityLogsGrid />
          </div>
        )}

        {/* Tab: Main Audit Categories & Status Dashboard */}
        {dashboardTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* ── REQUIREMENT SECTION 1: DASHBOARD MAIN VIEW (3 TOUCH-ENABLED AUDIT CATEGORIES) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" /> 1. Touch Audit Category Selection
                </h2>
                <span className="text-xs font-medium text-slate-500">
                  Touch / Click any category to switch active plan & status views
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* CATEGORY 1: PRODUCT AUDIT */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("Product Audit")}
                  className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                    selectedCategory === "Product Audit"
                      ? "border-orange-500 bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md ring-2 ring-orange-400"
                      : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 text-slate-800 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wider ${selectedCategory === "Product Audit" ? "text-orange-100" : "text-orange-600"}`}>
                        Audit Category
                      </p>
                      <h3 className="text-xl font-black mt-1 tracking-tight">Product Audit</h3>
                      <p className={`text-xs mt-1 font-medium ${selectedCategory === "Product Audit" ? "text-orange-100" : "text-slate-500"}`}>
                        Casting, dimensional & metallurgical audits
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 ${selectedCategory === "Product Audit" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"}`}>
                      <Package className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                    <span className="text-xs font-extrabold">Active Records</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${selectedCategory === "Product Audit" ? "bg-white text-orange-700" : "bg-orange-100 text-orange-800"}`}>
                      {allTaskRows.filter((r) => r.audit_type === "Product").length} Audits
                    </span>
                  </div>
                </button>

                {/* CATEGORY 2: REVALIDATION AUDIT */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("Revalidation Audit")}
                  className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                    selectedCategory === "Revalidation Audit"
                      ? "border-blue-600 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md ring-2 ring-blue-400"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-slate-800 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wider ${selectedCategory === "Revalidation Audit" ? "text-blue-100" : "text-blue-600"}`}>
                        Audit Category
                      </p>
                      <h3 className="text-xl font-black mt-1 tracking-tight">Revalidation Audit</h3>
                      <p className={`text-xs mt-1 font-medium ${selectedCategory === "Revalidation Audit" ? "text-blue-100" : "text-slate-500"}`}>
                        Bi-annual product layout & safety revalidation
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 ${selectedCategory === "Revalidation Audit" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>
                      <RefreshCcw className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                    <span className="text-xs font-extrabold">Active Records</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${selectedCategory === "Revalidation Audit" ? "bg-white text-blue-700" : "bg-blue-100 text-blue-800"}`}>
                      {allTaskRows.filter((r) => r.audit_type === "Revalidation").length} Audits
                    </span>
                  </div>
                </button>

                {/* CATEGORY 3: DOCK AUDIT */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("Dock Audit")}
                  className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                    selectedCategory === "Dock Audit"
                      ? "border-emerald-600 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md ring-2 ring-emerald-400"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-800 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wider ${selectedCategory === "Dock Audit" ? "text-emerald-100" : "text-emerald-600"}`}>
                        Audit Category
                      </p>
                      <h3 className="text-xl font-black mt-1 tracking-tight">Dock Audit</h3>
                      <p className={`text-xs mt-1 font-medium ${selectedCategory === "Dock Audit" ? "text-emerald-100" : "text-slate-500"}`}>
                        Dispatch packaging, VCI & dock inspection
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 ${selectedCategory === "Dock Audit" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                      <Building2 className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                    <span className="text-xs font-extrabold">Active Records</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${selectedCategory === "Dock Audit" ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-800"}`}>
                      {allTaskRows.filter((r) => r.audit_type === "Process" || r.audit_type === "Doc" || r.audit_type === "Dock Audit").length} Audits
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* ── REQUIREMENT SECTION 2: AUDIT STATUS VIEW (5 OPTIONS FOR SELECTED CATEGORY) ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-brand" /> 2. Status Options for [{selectedCategory.toUpperCase()}]
                </h2>
                <div className="text-xs text-slate-500 font-medium">
                  Flow: AUDIT DASHBOARD → {selectedCategory} → <strong className="text-brand">{selectedStatusView}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {/* OPTION 1: AUDIT PLAN */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusView("Audit Plan")}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    selectedStatusView === "Audit Plan"
                      ? "border-sky-600 bg-sky-600 text-white shadow-sm ring-2 ring-sky-300"
                      : "border-slate-200 bg-white hover:bg-sky-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Calendar className="h-4 w-4" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatusView === "Audit Plan" ? "bg-white text-sky-800" : "bg-sky-100 text-sky-800"}`}>
                      {planTasks.length}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase">Audit Plan</p>
                  <p className={`text-[10px] mt-0.5 ${selectedStatusView === "Audit Plan" ? "text-sky-100" : "text-slate-500"}`}>
                    Annual & Monthly Plans
                  </p>
                </button>

                {/* OPTION 2: ONGOING */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusView("Ongoing")}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    selectedStatusView === "Ongoing"
                      ? "border-amber-600 bg-amber-600 text-white shadow-sm ring-2 ring-amber-300"
                      : "border-slate-200 bg-white hover:bg-amber-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Timer className="h-4 w-4" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatusView === "Ongoing" ? "bg-white text-amber-800" : "bg-amber-100 text-amber-800"}`}>
                      {ongoingTasks.length}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase">Ongoing</p>
                  <p className={`text-[10px] mt-0.5 ${selectedStatusView === "Ongoing" ? "text-amber-100" : "text-slate-500"}`}>
                    Audits In Progress
                  </p>
                </button>

                {/* OPTION 3: AUDIT COMPLETED */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusView("Audit Completed")}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    selectedStatusView === "Audit Completed"
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300"
                      : "border-slate-200 bg-white hover:bg-emerald-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatusView === "Audit Completed" ? "bg-white text-emerald-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {completedTasks.length}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase">Audit Completed</p>
                  <p className={`text-[10px] mt-0.5 ${selectedStatusView === "Audit Completed" ? "text-emerald-100" : "text-slate-500"}`}>
                    Completed & Submitted
                  </p>
                </button>

                {/* OPTION 4: DEVIATION */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusView("Deviation")}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    selectedStatusView === "Deviation"
                      ? "border-rose-600 bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                      : "border-slate-200 bg-white hover:bg-rose-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <AlertTriangle className="h-4 w-4" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatusView === "Deviation" ? "bg-white text-rose-800" : "bg-rose-100 text-rose-800"}`}>
                      {deviationTasks.length}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase">Deviation</p>
                  <p className={`text-[10px] mt-0.5 ${selectedStatusView === "Deviation" ? "text-rose-100" : "text-slate-500"}`}>
                    Non-Conformances
                  </p>
                </button>

                {/* OPTION 5: LOW PRODUCTION */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusView("Low Production")}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    selectedStatusView === "Low Production"
                      ? "border-purple-600 bg-purple-600 text-white shadow-sm ring-2 ring-purple-300"
                      : "border-slate-200 bg-white hover:bg-purple-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <TrendingDown className="h-4 w-4" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatusView === "Low Production" ? "bg-white text-purple-800" : "bg-purple-100 text-purple-800"}`}>
                      {categoryLowProd.length}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase">Low Production</p>
                  <p className={`text-[10px] mt-0.5 ${selectedStatusView === "Low Production" ? "text-purple-100" : "text-slate-500"}`}>
                    Below Target Output
                  </p>
                </button>
              </div>
            </div>

            {/* ── REQUIREMENT SECTION 4: AUDIT PLAN SUB-VIEWS (WHEN AUDIT PLAN IS ACTIVE) ── */}
            {selectedStatusView === "Audit Plan" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-sky-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Audit Plan Sub-Views — [{selectedCategory}]
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTriggerImportExcel}
                      className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                      title="Import Excel file into Audit Plan"
                    >
                      <Upload className="h-3.5 w-3.5" /> Import Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCurrentViewExcel}
                      className="flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors shadow-2xs mr-2"
                      title="Export Audit Plan to Excel"
                    >
                      <Download className="h-3.5 w-3.5" /> Export Excel
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlanSubView("One Year Plan")}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                        selectedPlanSubView === "One Year Plan"
                          ? "bg-sky-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      One Year Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlanSubView("As-on-Month Plan")}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                        selectedPlanSubView === "As-on-Month Plan"
                          ? "bg-sky-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      As-on-Month Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlanSubView("Current Month Plan")}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                        selectedPlanSubView === "Current Month Plan"
                          ? "bg-sky-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Current Month Plan
                    </button>
                  </div>
                </div>

                {/* Sub-View Descriptions & Controls */}
                {selectedPlanSubView === "As-on-Month Plan" && (
                  <div className="flex items-center gap-3 bg-sky-50 p-3 rounded-xl border border-sky-200 flex-wrap justify-between">
                    <p className="text-xs text-sky-900 font-bold">
                      Select target month to inspect scheduled audits for that specific timeframe:
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Selected Month:</span>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-sky-500"
                      >
                        {MONTHS.map((m, idx) => (
                          <option key={m} value={idx + 1}>
                            {m} ({idx + 1})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Search Bar for Plan Records */}
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Audit ID, Part Number, Auditor, Department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none font-medium"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* ── TABLE VIEW FOR AUDIT PLAN ── */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        {selectedPlanSubView === "As-on-Month Plan" && <th className="p-3">Selected Month</th>}
                        <th className="p-3">Audit ID</th>
                        <th className="p-3">Audit Type</th>
                        <th className="p-3">Product / Part Name</th>
                        <th className="p-3">Part Number</th>
                        <th className="p-3">Planned Date</th>
                        <th className="p-3">Auditor</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Status</th>
                        {isAdmin && <th className="p-3 text-right">Admin Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categoryTasks
                        .filter((r) => {
                          if (selectedPlanSubView === "As-on-Month Plan") return r.month === selectedMonth;
                          if (selectedPlanSubView === "Current Month Plan") return r.month === new Date().getMonth() + 1;
                          return true; // One Year Plan
                        })
                        .filter((r) => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            r.audit_code.toLowerCase().includes(q) ||
                            r.title.toLowerCase().includes(q) ||
                            (r.auditor_name && r.auditor_name.toLowerCase().includes(q)) ||
                            r.area.toLowerCase().includes(q)
                          );
                        })
                        .map((task) => (
                          <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                            {selectedPlanSubView === "As-on-Month Plan" && (
                              <td className="p-3 font-bold text-sky-700">
                                {MONTHS[task.month - 1] ?? `Month ${task.month}`}
                              </td>
                            )}
                            <td className="p-3 font-mono font-black text-slate-900">{task.audit_code}</td>
                            <td className="p-3 font-bold text-slate-700">{task.audit_type}</td>
                            <td className="p-3 font-medium text-slate-800 max-w-xs truncate">{task.title}</td>
                            <td className="p-3 font-mono text-slate-600">{task.audit_code}</td>
                            <td className="p-3 font-medium text-slate-700">{task.due_date}</td>
                            <td className="p-3 font-medium text-slate-700">{task.auditor_name ?? task.assigned_to_employee_number}</td>
                            <td className="p-3 font-medium text-slate-600">{task.area}</td>
                            <td className="p-3">
                              <StatusBadge status={task.status} />
                            </td>
                            {isAdmin && (
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDocAudit(task);
                                      setIsDocModalOpen(true);
                                    }}
                                    className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-sky-400 hover:text-sky-600"
                                    title="Document Management (Upload / View docs)"
                                  >
                                    <File className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAudit(task);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-amber-400 hover:text-amber-600"
                                    title="Edit / Reschedule Audit Plan"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAuditRecord(task.id)}
                                    className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-rose-400 hover:text-rose-600"
                                    title="Remove Audit Plan"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── REQUIREMENT SECTION 9: ONGOING VIEW ── */}
            {selectedStatusView === "Ongoing" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Ongoing Audits — [{selectedCategory}]
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerImportExcel}
                      className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                    >
                      <Upload className="h-3.5 w-3.5" /> Import Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCurrentViewExcel}
                      className="flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Export Excel
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Audit ID</th>
                        <th className="p-3">Product / Part Number</th>
                        <th className="p-3">Start Date & Time</th>
                        <th className="p-3">Auditor</th>
                        <th className="p-3">Progress</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ongoingTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-black text-slate-900">{task.audit_code}</td>
                          <td className="p-3 font-medium text-slate-800">
                            <div>{task.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{task.audit_code}</div>
                          </td>
                          <td className="p-3 font-medium text-slate-700">{task.start_date_time ?? `${task.due_date} 09:00 AM`}</td>
                          <td className="p-3 font-medium text-slate-700">{task.auditor_name ?? task.assigned_to_employee_number}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${task.progress_pct ?? 60}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{task.progress_pct ?? 60}%</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <StatusBadge status={task.status} />
                          </td>
                          <td className="p-3 text-right">
                            <Button asChild size="sm" className="bg-brand text-white text-xs font-bold hover:bg-brand-hover">
                              <Link to="/audit/$auditId" params={{ auditId: task.id }}>
                                Open Checklist
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── REQUIREMENT SECTION 10: AUDIT COMPLETED VIEW ── */}
            {selectedStatusView === "Audit Completed" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Completed Audits — [{selectedCategory}]
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerImportExcel}
                      className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                    >
                      <Upload className="h-3.5 w-3.5" /> Import Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCurrentViewExcel}
                      className="flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Export Excel
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Audit ID</th>
                        <th className="p-3">Product / Part Number</th>
                        <th className="p-3">Audit Date</th>
                        <th className="p-3">Auditor</th>
                        <th className="p-3">Completion Date</th>
                        <th className="p-3">Final Result</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {completedTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-black text-slate-900">{task.audit_code}</td>
                          <td className="p-3 font-medium text-slate-800">
                            <div>{task.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{task.audit_code}</div>
                          </td>
                          <td className="p-3 font-medium text-slate-700">{task.due_date}</td>
                          <td className="p-3 font-medium text-slate-700">{task.auditor_name ?? task.assigned_to_employee_number}</td>
                          <td className="p-3 font-medium text-slate-700">{task.completion_date ?? task.due_date}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 text-[11px]">
                              <Check className="h-3 w-3" /> {task.final_result ?? "PASS / COMPLIANT"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button asChild size="sm" variant="outline" className="border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-xs">
                              <Link to="/audit/$auditId" params={{ auditId: task.id }}>
                                View Report
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── REQUIREMENT SECTION 11: DEVIATION VIEW ── */}
            {selectedStatusView === "Deviation" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Deviation & Non-Conformance Records — [{selectedCategory}]
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerImportExcel}
                      className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                    >
                      <Upload className="h-3.5 w-3.5" /> Import Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCurrentViewExcel}
                      className="flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Export Excel
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Deviation ID</th>
                        <th className="p-3">Audit ID</th>
                        <th className="p-3">Product / Part Number</th>
                        <th className="p-3">Deviation Description</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Responsible Person / Dept</th>
                        <th className="p-3">Corrective Action</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Closure Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deviationTasks.map((dev) => (
                        <tr key={dev.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-black text-rose-700">{dev.dev_code ?? dev.id.slice(0, 8)}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{dev.audit_id ?? "AUD-MSIL-01"}</td>
                          <td className="p-3 font-mono font-medium text-slate-700">{dev.product_part_number ?? "0401DAA02010N"}</td>
                          <td className="p-3 font-medium text-slate-800 max-w-xs">{dev.description}</td>
                          <td className="p-3">
                            <span className={`rounded-md px-2 py-0.5 font-bold text-[10px] ${dev.severity === "High" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                              {dev.severity ?? "High"}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-700">{dev.responsible_person ?? dev.employee_number} ({dev.department ?? "QA"})</td>
                          <td className="p-3 font-medium text-slate-700">{dev.corrective_action ?? "Under Review"}</td>
                          <td className="p-3 font-medium text-slate-600">{dev.due_date ?? dev.created_at}</td>
                          <td className="p-3">
                            <StatusBadge status={dev.closure_status ?? dev.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── REQUIREMENT SECTION 12: LOW PRODUCTION VIEW ── */}
            {selectedStatusView === "Low Production" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-purple-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Low Production Monitoring — [{selectedCategory}]
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerImportExcel}
                      className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                    >
                      <Upload className="h-3.5 w-3.5" /> Import Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCurrentViewExcel}
                      className="flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Export Excel
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Part Number</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3 text-right">Planned Production</th>
                        <th className="p-3 text-right">Actual Production</th>
                        <th className="p-3 text-center">Production %</th>
                        <th className="p-3 text-center">Threshold</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categoryLowProd.map((lp) => (
                        <tr key={lp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-black text-purple-900">{lp.part_number}</td>
                          <td className="p-3 font-bold text-slate-800">{lp.product_name}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-700">{lp.planned_production.toLocaleString()} PCS</td>
                          <td className="p-3 text-right font-mono font-bold text-purple-700">{lp.actual_production.toLocaleString()} PCS</td>
                          <td className="p-3 text-center font-black">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full ${lp.production_percentage < lp.threshold_percentage ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {lp.production_percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-600">{lp.threshold_percentage}%</td>
                          <td className="p-3">
                            <span className={`rounded-md px-2.5 py-1 font-bold text-[11px] ${lp.status === "Critical" ? "bg-rose-600 text-white" : "bg-amber-500 text-white"}`}>
                              {lp.status === "Critical" ? "BELOW THRESHOLD" : "ATTENTION REQUIRED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: ADMIN DOCUMENT MANAGEMENT ── */}
      {isDocModalOpen && selectedDocAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <File className="h-4 w-4 text-sky-600" /> Document Management — [{selectedDocAudit.audit_code}]
              </h3>
              <button type="button" onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Attached files and specifications for audit record <strong>{selectedDocAudit.title}</strong>:
              </p>

              {/* List of existing documents */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(documentsMap[selectedDocAudit.id] ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center">
                    No documents attached to this audit plan yet.
                  </p>
                ) : (
                  (documentsMap[selectedDocAudit.id] ?? []).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{doc.document_name}</p>
                        <p className="text-[10px] text-slate-400">
                          Uploaded by {doc.uploaded_by} on {doc.uploaded_at}
                        </p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-sky-600 hover:underline">
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    </div>
                  ))
                )}
              </div>

              {/* Admin Add/Upload Form */}
              {isAdmin && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-bold text-slate-700">Attach New Audit Document / Spec File</h4>
                  <input
                    type="text"
                    placeholder="Document Title (e.g. QF/08/CQA-37 Master Spec)"
                    value={docNameInput}
                    onChange={(e) => setDocNameInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
                  />
                  <input
                    type="text"
                    placeholder="File URL or absolute storage path (e.g. /docs/spec.pdf)"
                    value={docFileUrlInput}
                    onChange={(e) => setDocFileUrlInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
                  />
                  <Button type="button" onClick={handleAddDocument} size="sm" className="w-full bg-sky-700 text-white font-bold hover:bg-sky-800 text-xs gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Attach Document
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsDocModalOpen(false)} className="text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADMIN CREATE / EDIT / RESCHEDULE AUDIT PLAN ── */}
      {(isAddPlanModalOpen || isEditModalOpen) && editingAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-brand" /> {isAddPlanModalOpen ? "Create New Audit Plan" : `Edit / Reschedule Audit Plan [${editingAudit.audit_code}]`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddPlanModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Code / ID</label>
                <input
                  type="text"
                  value={editingAudit.audit_code}
                  onChange={(e) => setEditingAudit({ ...editingAudit, audit_code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product / Part Name</label>
                <input
                  type="text"
                  value={editingAudit.title}
                  onChange={(e) => setEditingAudit({ ...editingAudit, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Audit Type Category</label>
                  <select
                    value={editingAudit.audit_type}
                    onChange={(e) => setEditingAudit({ ...editingAudit, audit_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-medium"
                  >
                    <option value="Product">Product</option>
                    <option value="Revalidation">Revalidation</option>
                    <option value="Dock Audit">Dock Audit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Planned Date / Reschedule</label>
                  <input
                    type="date"
                    value={editingAudit.due_date}
                    onChange={(e) => setEditingAudit({ ...editingAudit, due_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Auditor Name / Emp ID</label>
                  <input
                    type="text"
                    value={editingAudit.auditor_name ?? editingAudit.assigned_to_employee_number}
                    onChange={(e) => setEditingAudit({ ...editingAudit, auditor_name: e.target.value, assigned_to_employee_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department / Area</label>
                  <input
                    type="text"
                    value={editingAudit.area}
                    onChange={(e) => setEditingAudit({ ...editingAudit, area: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Management</label>
                <select
                  value={editingAudit.status}
                  onChange={(e) => setEditingAudit({ ...editingAudit, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 font-bold text-slate-800"
                >
                  <option value="Planned">Planned</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress / Ongoing</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Completed">Completed</option>
                  <option value="Deviation">Deviation</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddPlanModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSaveAuditRecord(editingAudit)}
                className="bg-brand text-white font-bold hover:bg-brand-hover text-xs"
              >
                Save Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
