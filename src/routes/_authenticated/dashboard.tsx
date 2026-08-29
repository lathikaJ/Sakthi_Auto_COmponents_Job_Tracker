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
  Paperclip,
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
  mergeAndDeduplicateTasks,
} from "@/lib/audit";
import { updateSubmittedAuditStatus } from "@/lib/submittedAudits";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Audit Dashboard — Sakthi Auto Value Added Engineering & Audits" },
      {
        name: "description",
        content: "Product Audit, Revalidation Audit, and Dock Audit management dashboard with live status monitoring.",
      },
      { property: "og:title", content: "Audit Dashboard — Sakthi Auto Value Added Engineering & Audits" },
    ],
  }),
  component: DashboardPage,
});

type Assignment = {
  id: string;
  sl_no?: number | string;
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
  attached_file_name?: string;
  attached_file_url?: string;
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
  const planFileInputRef = useRef<HTMLInputElement>(null);

  // Level 1: Touch Audit Category Selection (Product Audit | Revalidation Audit | Dock Audit)
  const [selectedCategory, setSelectedCategory] = useState<"Product Audit" | "Revalidation Audit" | "Dock Audit">("Product Audit");

  // Level 2: 6 Audit Status Option Cards
  // (Audit Plan | Ongoing | Under Review | Audit Completed | Deviation | No Production)
  const [selectedStatusView, setSelectedStatusView] = useState<
    "Audit Plan" | "Ongoing" | "Under Review" | "Audit Completed" | "Deviation" | "No Production"
  >("Audit Plan");

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

  // Employee Dashboard filter state for Assigned Work / Ongoing Audit section
  const [empWorkFilter, setEmpWorkFilter] = useState<"all" | "ongoing" | "plan" | "review_completed">("all");

  useEffect(() => {
    const loadStored = () => {
      if (typeof window !== "undefined") {
        const storedTasks = localStorage.getItem("sakthi_excel_tasks_v8");
        if (storedTasks) {
          try {
            const parsed = JSON.parse(storedTasks);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const clean = mergeAndDeduplicateTasks(parsed);
              setLocalExcelTasks(clean);
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
    window.addEventListener("sakthi_submitted_audits_updated", loadStored);
    window.addEventListener("sakthi_signatures_updated", loadStored);
    return () => {
      window.removeEventListener("excel_tasks_updated", loadStored);
      window.removeEventListener("sakthi_deviations_updated", loadStored);
      window.removeEventListener("sakthi_submitted_audits_updated", loadStored);
      window.removeEventListener("sakthi_signatures_updated", loadStored);
    };
  }, []);

  const rawTaskRows: Assignment[] = mergeAndDeduplicateTasks(
    (localExcelTasks.length > 0 ? localExcelTasks : dbRows.length > 0 ? dbRows : DEFAULT_OFFICIAL_AUDITS) as Assignment[]
  );
  const currentEmpNumber = profile?.employee_number;
  const currentEmpName = profile?.full_name?.toLowerCase();

  const allTaskRows = useMemo(() => {
    if (isAdmin) return rawTaskRows;
    return rawTaskRows.filter((r) => {
      if (!currentEmpNumber) return true;
      const empIdMatch = r.assigned_to_employee_number === currentEmpNumber;
      const empNameMatch = Boolean(currentEmpName && r.auditor_name?.toLowerCase().includes(currentEmpName));
      const auditorIdMatch = Boolean(r.auditor_name && r.auditor_name.includes(currentEmpNumber));
      const empNumInAssigned = Boolean(r.assigned_to_employee_number && r.assigned_to_employee_number.includes(currentEmpNumber));
      return empIdMatch || empNameMatch || auditorIdMatch || empNumInAssigned;
    });
  }, [isAdmin, rawTaskRows, currentEmpNumber, currentEmpName]);

  const assignedWorkTasks = useMemo(() => {
    return allTaskRows.filter((task) => {
      if (empWorkFilter === "ongoing") {
        return ["In Progress", "Ongoing", "Assigned", "Planned"].includes(task.status);
      }
      if (empWorkFilter === "plan") {
        return ["Planned", "Assigned", "Pending"].includes(task.status);
      }
      if (empWorkFilter === "review_completed") {
        return ["Submitted", "Under Review", "Completed", "Approved", "Deviation"].includes(task.status);
      }
      return true;
    });
  }, [allTaskRows, empWorkFilter]);

  const allDeviations: Deviation[] = localDeviations.length > 0 ? localDeviations : dbDevs;

  // Helper matching Audit Type to Category
  const matchesCategory = (type: string, cat: "Product Audit" | "Revalidation Audit" | "Dock Audit") => {
    if (cat === "Product Audit") return type === "Product" || type === "Product Audit";
    if (cat === "Revalidation Audit") return type === "Revalidation" || type === "Revalidation Audit";
    if (cat === "Dock Audit") return type === "Process" || type === "Doc" || type === "Doc Audit" || type === "Dock Audit";
    return false;
  };

  // Filter tasks by selected audit category
  const categoryTasks = useMemo(() => {
    return allTaskRows.filter((r) => matchesCategory(r.audit_type, selectedCategory));
  }, [allTaskRows, selectedCategory]);

  // Filter helper for Plan Sub-Views (One Year Plan, As-on-Month Plan, Current Month Plan)
  const filterByPlanSubView = (r: { month?: number }) => {
    if (selectedPlanSubView === "As-on-Month Plan") return r.month === selectedMonth;
    if (selectedPlanSubView === "Current Month Plan") return r.month === new Date().getMonth() + 1;
    return true; // One Year Plan
  };

  // Counts for 6 status option cards under the selected category
  const planTasks = useMemo(() => {
    return categoryTasks.filter((r) => r.status === "Planned" || r.status === "Assigned" || r.status === "Pending");
  }, [categoryTasks]);

  const ongoingTasks = useMemo(() => {
    return categoryTasks.filter((r) => r.status === "In Progress" || r.status === "Ongoing" || r.status === "Planned" || r.status === "Assigned");
  }, [categoryTasks]);

  const underReviewTasks = useMemo(() => {
    return categoryTasks.filter((r) => r.status === "Submitted" || r.status === "Under Review");
  }, [categoryTasks]);

  const completedTasks = useMemo(() => {
    return categoryTasks.filter((r) => r.status === "Completed" || r.status === "Approved");
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

  // Excel Export Handler for All Audits / Current View (Admin Only)
  const handleExportCurrentViewExcel = () => {
    if (!isAdmin) {
      toast.error("Excel export is restricted to Admin (KARTHIKEYAN C).");
      return;
    }
    let exportData: any[] = [];
    const dateTag = new Date().toISOString().split("T")[0] ?? "";
    const fileName = `Sakthi_Auto_${selectedCategory.replace(/\s+/g, "_")}_${selectedStatusView.replace(/\s+/g, "_")}_${dateTag}.xlsx`;

    if (selectedStatusView === "Audit Plan") {
      const list = categoryTasks.filter(filterByPlanSubView);
      exportData = list.map((task, idx) => ({
        "SL. NO.": task.sl_no ?? (idx + 1),
        "Audit ID": task.audit_code,
        "Audit Category": selectedCategory,
        "Audit Type": task.audit_type,
        "Product / Part Name": task.title,
        "Part Number": task.audit_code,
        "Planned Month": MONTHS[task.month - 1] ?? `Month ${task.month}`,
        "Planned Date": task.due_date,
        "Auditor": task.auditor_name ?? task.assigned_to_employee_number,
        "Department": task.area,
        "Attachment File": task.attached_file_name || "None",
        "Status": task.status,
      }));
    } else if (selectedStatusView === "Ongoing") {
      exportData = ongoingTasks.filter(filterByPlanSubView).map((task, idx) => ({
        "SL. NO.": task.sl_no ?? (idx + 1),
        "Audit ID": task.audit_code,
        "Audit Category": selectedCategory,
        "Product / Part Number": task.title,
        "Planned Month": MONTHS[task.month - 1] ?? `Month ${task.month}`,
        "Start Date & Time": task.start_date_time ?? `${task.due_date} 09:00 AM`,
        "Auditor": task.auditor_name ?? task.assigned_to_employee_number,
        "Attachment File": task.attached_file_name || "None",
        "Progress %": `${task.progress_pct ?? 60}%`,
        "Status": task.status,
      }));
    } else if (selectedStatusView === "Under Review") {
      exportData = underReviewTasks.filter(filterByPlanSubView).map((task, idx) => ({
        "SL. NO.": task.sl_no ?? (idx + 1),
        "Audit ID": task.audit_code,
        "Audit Category": selectedCategory,
        "Product / Part Name": task.title,
        "Auditor": task.auditor_name ?? task.assigned_to_employee_number,
        "Submission Date": task.due_date,
        "Status": "Under Review",
      }));
    } else if (selectedStatusView === "Audit Completed") {
      exportData = completedTasks.filter(filterByPlanSubView).map((task, idx) => ({
        "SL. NO.": task.sl_no ?? (idx + 1),
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
    } else if (selectedStatusView === "No Production") {
      exportData = categoryLowProd.map((lp, idx) => ({
        "SL. NO.": idx + 1,
        "Part Number": lp.part_number,
        "Product Name": lp.product_name,
        "Audit Type": lp.audit_type,
        "Planned Production (PCS)": lp.planned_production,
        "Actual Production (PCS)": lp.actual_production,
        "Production %": `${lp.production_percentage.toFixed(1)}%`,
        "Threshold %": `${lp.threshold_percentage}%`,
        "Status": "No Production",
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

  // Excel Import Handler for All Audits (Admin Only)
  const handleTriggerImportExcel = () => {
    if (!isAdmin) {
      toast.error("Excel import is restricted to Admin (KARTHIKEYAN C).");
      return;
    }
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
            sl_no: item["SL. NO."] || item["Serial Number"] || idx + 1,
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
            attached_file_name: file.name,
          };
        });

        const updated = mergeAndDeduplicateTasks(rawTaskRows, importedTasks);
        setLocalExcelTasks(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(updated));
          window.dispatchEvent(new Event("excel_tasks_updated"));
        }
        toast.success(`Imported & smart-merged ${importedTasks.length} audit records into ${selectedCategory}! Total unique tasks: ${updated.length}.`);
      } catch (err) {
        toast.error("Failed to parse Excel file. Please ensure valid file format (.xlsx, .xls, .csv).");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle plan modal file attachment upload
  const handlePlanFileAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingAudit) return;
    setEditingAudit({
      ...editingAudit,
      attached_file_name: file.name,
      attached_file_url: URL.createObjectURL(file),
    });
    toast.success(`Attached Excel sheet: ${file.name}`);
  };

  // Admin Actions
  const handleSaveAuditRecord = (updated: Assignment) => {
    if (!updated.title.trim() || !updated.audit_code.trim()) {
      toast.error("Please enter Part Name and Part Number.");
      return;
    }
    const list = rawTaskRows.map((t) => (t.id === updated.id ? updated : t));
    if (!list.some((t) => t.id === updated.id)) {
      list.unshift(updated);
    }
    setLocalExcelTasks(list);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(list));
      window.dispatchEvent(new Event("excel_tasks_updated"));
    }
    toast.success(`Audit plan for ${updated.title} added successfully! Visible in Audit Plan & Ongoing Audit.`);
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

          {/* EXCEL IMPORT & EXPORT BUTTONS (ADMIN ONLY) */}
          {isAdmin && (
            <>
              <Button
                type="button"
                onClick={handleTriggerImportExcel}
                className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs text-xs gap-1.5"
                title="Import audits from Excel spreadsheet (.xlsx, .csv)"
              >
                <Upload className="h-3.5 w-3.5" /> Import Excel
              </Button>

              <Button
                type="button"
                onClick={handleExportCurrentViewExcel}
                className="bg-sky-700 text-white font-bold hover:bg-sky-800 shadow-xs text-xs gap-1.5"
                title="Export currently displayed audit records to Excel (.xlsx)"
              >
                <Download className="h-3.5 w-3.5" /> Export Excel
              </Button>
            </>
          )}

          {isAdmin && (
            <Button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split("T")[0] ?? "";
                const catPrefix = selectedCategory.split(" ")[0] ?? "Product";
                const nextSlNo = categoryTasks.length + 1;
                setEditingAudit({
                  id: `aud-${Date.now()}`,
                  sl_no: nextSlNo,
                  audit_code: `REV-${String(nextSlNo).padStart(3, "0")}`,
                  title: "",
                  audit_type: selectedCategory === "Dock Audit" ? "Dock Audit" : catPrefix,
                  area: "Machine Shop Line 1",
                  month: selectedMonth,
                  year: new Date().getFullYear(),
                  due_date: today,
                  status: "Planned",
                  assigned_to_employee_number: profile?.employee_number ?? "688079",
                  auditor_name: profile?.full_name ?? "Lead Auditor",
                  department: "Quality Assurance",
                  attached_file_name: "",
                  attached_file_url: "",
                });
                setIsAddPlanModalOpen(true);
              }}
              className="bg-brand text-white font-bold hover:bg-brand-hover shadow-sm text-xs gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Plan
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
                <span>Review Queue (Under Review)</span>
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
            {/* ── DEDICATED ASSIGNED WORK / ONGOING AUDIT SECTION (EMPLOYEE DASHBOARD & DUAL SYNC) ── */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-amber-500/20 p-2 text-amber-400 border border-amber-500/30">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        Assigned Work / Ongoing Audit
                        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-extrabold text-white">
                          {allTaskRows.length} {allTaskRows.length === 1 ? "Task" : "Tasks"}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-300 font-medium">
                        {isAdmin
                          ? "All Admin-assigned audit tasks synchronized in real-time across the plant."
                          : `All work assigned to ${profile?.full_name ?? "Employee"} (${profile?.employee_number}) by Admin.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-Filter Tabs for Assigned Work */}
                <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setEmpWorkFilter("all")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      empWorkFilter === "all"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    All Assigned ({allTaskRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpWorkFilter("ongoing")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      empWorkFilter === "ongoing"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Ongoing / In Progress ({allTaskRows.filter((t) => ["In Progress", "Ongoing", "Assigned", "Planned"].includes(t.status)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpWorkFilter("plan")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      empWorkFilter === "plan"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Audit Plan ({allTaskRows.filter((t) => ["Planned", "Assigned", "Pending"].includes(t.status)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpWorkFilter("review_completed")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      empWorkFilter === "review_completed"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Reviewed & Completed ({allTaskRows.filter((t) => ["Submitted", "Under Review", "Completed", "Approved", "Deviation"].includes(t.status)).length})
                  </button>
                </div>
              </div>

              {/* Table of Admin-Assigned Work */}
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-md">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-300 font-extrabold uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3 w-14 text-center">SL. NO.</th>
                      <th className="p-3">PART NAME</th>
                      <th className="p-3">PART NUMBER</th>
                      <th className="p-3">AUDIT CATEGORY</th>
                      <th className="p-3">DEPARTMENT</th>
                      <th className="p-3">PLANNED DATE</th>
                      <th className="p-3">ATTACHED EXCEL</th>
                      <th className="p-3">AUDITOR</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-slate-200">
                    {assignedWorkTasks.map((task, idx) => (
                      <tr key={task.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-slate-400">
                          {task.sl_no ?? idx + 1}
                        </td>
                        <td className="p-3 font-bold text-white max-w-xs">{task.title}</td>
                        <td className="p-3 font-mono font-bold text-amber-400">{task.audit_code}</td>
                        <td className="p-3 font-semibold text-sky-300">{task.audit_type}</td>
                        <td className="p-3 font-medium text-slate-300">{task.area}</td>
                        <td className="p-3 font-bold text-emerald-400">
                          {task.due_date ? `${MONTHS[(task.month || 1) - 1]} ${new Date(task.due_date).getDate() || 1}, ${task.year || 2026}` : `${MONTHS[(task.month || 1) - 1]} ${task.year || 2026}`}
                        </td>
                        <td className="p-3">
                          {task.attached_file_name ? (
                            <Link
                              to="/audit/$auditId"
                              params={{ auditId: task.id }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                              title="Click to open attached Excel inspection checklist"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="truncate max-w-[130px]">{task.attached_file_name}</span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 italic">
                              <Paperclip className="h-3 w-3" /> No file
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-300">
                          {task.auditor_name ?? task.assigned_to_employee_number}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="p-3 text-right">
                          <Button asChild size="sm" className="bg-amber-600 text-white font-bold hover:bg-amber-500 text-xs shadow-xs gap-1">
                            <Link to="/audit/$auditId" params={{ auditId: task.id }}>
                              Start Audit / Open Checklist <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {assignedWorkTasks.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-xs font-semibold text-slate-400 italic">
                          No Admin-assigned work matching the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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
                      {allTaskRows.filter((r) => r.audit_type === "Product" || r.audit_type === "Product Audit").length} Audits
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
                      {allTaskRows.filter((r) => r.audit_type === "Revalidation" || r.audit_type === "Revalidation Audit").length} Audits
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

            {/* ── REQUIREMENT SECTION 2: 6 AUDIT STATUS CARDS FOR SELECTED CATEGORY ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-brand" /> 2. 6 Status Option Cards for [{selectedCategory.toUpperCase()}]
                </h2>
                <div className="text-xs text-slate-500 font-medium">
                  Flow: AUDIT DASHBOARD → {selectedCategory} → <strong className="text-brand">{selectedStatusView}</strong>
                </div>
              </div>

              {/* 6 STATUS OPTION CARDS */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {/* CARD 1: AUDIT PLAN */}
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

                {/* CARD 2: ONGOING AUDIT */}
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
                  <p className="mt-2 text-xs font-black uppercase">Ongoing Audit</p>
                  <p className={`text-[10px] mt-0.5 ${selectedStatusView === "Ongoing" ? "text-amber-100" : "text-slate-500"}`}>
                    Audits In Progress
                  </p>
                </button>

                {/* CARD 3: UNDER REVIEW (6TH AUDIT STATUS CARD WITH ICON) */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusView("Under Review")}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    selectedStatusView === "Under Review"
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                      : "border-slate-200 bg-white hover:bg-indigo-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <FileCheck2 className="h-4 w-4" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatusView === "Under Review" ? "bg-white text-indigo-800" : "bg-indigo-100 text-indigo-800"}`}>
                      {underReviewTasks.length}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase">Under Review</p>
                  <p className={`text-[10px] mt-0.5 ${selectedStatusView === "Under Review" ? "text-indigo-100" : "text-slate-500"}`}>
                    Pending Admin Signature
                  </p>
                </button>

                {/* CARD 4: AUDIT COMPLETED */}
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
                    Approved & Signed
                  </p>
                </button>

                {/* CARD 5: DEVIATION */}
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

                {/* CARD 6: NO PRODUCTION */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusView("No Production")}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    selectedStatusView === "No Production"
                      ? "border-purple-600 bg-purple-600 text-white shadow-sm ring-2 ring-purple-300"
                      : "border-slate-200 bg-white hover:bg-purple-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <TrendingDown className="h-4 w-4" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatusView === "No Production" ? "bg-white text-purple-800" : "bg-purple-100 text-purple-800"}`}>
                      {categoryLowProd.length}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase">No Production</p>
                  <p className={`text-[10px] mt-0.5 ${selectedStatusView === "No Production" ? "text-purple-100" : "text-slate-500"}`}>
                    Zero Output / Line Stopped
                  </p>
                </button>
              </div>
            </div>

            {/* ── PLAN SUB-VIEWS (ONE YEAR PLAN | AS-ON-MONTH PLAN | CURRENT MONTH PLAN) APPLICABLE ACROSS ALL 6 AUDIT VIEWS ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sky-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Plan Sub-Views — [{selectedCategory} / {selectedStatusView}]
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* ADD PLAN BUTTON (ADMIN ONLY) */}
                  {isAdmin && selectedStatusView === "Audit Plan" && (
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split("T")[0] ?? "";
                        const catPrefix = selectedCategory.split(" ")[0] ?? "Product";
                        const nextSlNo = categoryTasks.length + 1;
                        setEditingAudit({
                          id: `aud-${Date.now()}`,
                          sl_no: nextSlNo,
                          audit_code: `REV-${String(nextSlNo).padStart(3, "0")}`,
                          title: "",
                          audit_type: selectedCategory === "Dock Audit" ? "Dock Audit" : catPrefix,
                          area: "Machine Shop Line 1",
                          month: selectedMonth,
                          year: new Date().getFullYear(),
                          due_date: today,
                          status: "Planned",
                          assigned_to_employee_number: profile?.employee_number ?? "688079",
                          auditor_name: profile?.full_name ?? "Lead Auditor",
                          department: "Quality Assurance",
                          attached_file_name: "",
                          attached_file_url: "",
                        });
                        setIsAddPlanModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-700 transition-colors shadow-2xs mr-2"
                      title="Add new audit plan with serial number, part name, part number, planned month, and excel attachment"
                    >
                      <Plus className="h-4 w-4" /> Add Plan
                    </button>
                  )}

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
                  placeholder="Search by Audit ID, Part Number, Part Name, Auditor, Department..."
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

              {/* ── VIEW 1: AUDIT PLAN TABLE ── */}
              {selectedStatusView === "Audit Plan" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-14 text-center">SL. NO.</th>
                        <th className="p-3">PART NAME</th>
                        <th className="p-3">PART NUMBER</th>
                        <th className="p-3">PLANNED MONTH</th>
                        <th className="p-3">EXCEL ATTACHMENT</th>
                        <th className="p-3">AUDITOR</th>
                        <th className="p-3">STATUS</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categoryTasks
                        .filter(filterByPlanSubView)
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
                        .map((task, idx) => (
                          <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center font-mono font-bold text-slate-500">
                              {task.sl_no ?? idx + 1}
                            </td>
                            <td className="p-3 font-bold text-slate-900 max-w-xs">{task.title}</td>
                            <td className="p-3 font-mono font-bold text-indigo-700">{task.audit_code}</td>
                            <td className="p-3 font-bold text-sky-700">
                              {task.due_date ? `${MONTHS[(task.month || 1) - 1]} ${new Date(task.due_date).getDate() || 1}, ${task.year || 2026}` : `${MONTHS[(task.month || 1) - 1]} ${task.year || 2026}`}
                            </td>
                            <td className="p-3">
                              {task.attached_file_name ? (
                                <Link
                                  to="/audit/$auditId"
                                  params={{ auditId: task.id }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                                  title="Click to open attached Excel inspection checklist"
                                >
                                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="truncate max-w-[140px]">{task.attached_file_name}</span>
                                </Link>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 italic">
                                  <Paperclip className="h-3 w-3" /> No file attached
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-medium text-slate-700">{task.auditor_name ?? task.assigned_to_employee_number}</td>
                            <td className="p-3">
                              <StatusBadge status={task.status} />
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button asChild size="sm" className="bg-brand text-white text-xs font-bold hover:bg-brand-hover">
                                  <Link to="/audit/$auditId" params={{ auditId: task.id }}>
                                    Open Inspection
                                  </Link>
                                </Button>

                                {isAdmin && (
                                  <>
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
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── VIEW 2: ONGOING AUDIT TABLE ── */}
              {selectedStatusView === "Ongoing" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-14 text-center">SL. NO.</th>
                        <th className="p-3">PART NAME</th>
                        <th className="p-3">PART NUMBER</th>
                        <th className="p-3">PLANNED MONTH</th>
                        <th className="p-3">ATTACHED EXCEL</th>
                        <th className="p-3">AUDITOR</th>
                        <th className="p-3">PROGRESS</th>
                        <th className="p-3">STATUS</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ongoingTasks.filter(filterByPlanSubView).map((task, idx) => (
                        <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-mono font-bold text-slate-500">
                            {task.sl_no ?? idx + 1}
                          </td>
                          <td className="p-3 font-bold text-slate-900 max-w-xs">{task.title}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{task.audit_code}</td>
                          <td className="p-3 font-bold text-sky-700">
                            {task.due_date ? `${MONTHS[(task.month || 1) - 1]} ${new Date(task.due_date).getDate() || 1}, ${task.year || 2026}` : `${MONTHS[(task.month || 1) - 1]} ${task.year || 2026}`}
                          </td>
                          <td className="p-3">
                            {task.attached_file_name ? (
                              <Link
                                to="/audit/$auditId"
                                params={{ auditId: task.id }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                                title="Click to open attached Excel inspection checklist"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="truncate max-w-[140px]">{task.attached_file_name}</span>
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 italic">
                                <Paperclip className="h-3 w-3" /> No file attached
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-medium text-slate-700">{task.auditor_name ?? task.assigned_to_employee_number}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-slate-200 overflow-hidden">
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
              )}

              {/* ── VIEW 3: UNDER REVIEW AUDIT TABLE (WITH UNDER REVIEW ICON & ADMIN E-SIGN ACTION) ── */}
              {selectedStatusView === "Under Review" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-14 text-center">SL. NO.</th>
                        <th className="p-3">PART NAME</th>
                        <th className="p-3">PART NUMBER</th>
                        <th className="p-3">PLANNED MONTH</th>
                        <th className="p-3">SUBMITTED BY</th>
                        <th className="p-3">SUBMISSION DATE</th>
                        <th className="p-3">STATUS</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {underReviewTasks.filter(filterByPlanSubView).map((task, idx) => (
                        <tr key={task.id} className="hover:bg-indigo-50/50 transition-colors">
                          <td className="p-3 text-center font-mono font-bold text-slate-500">
                            {task.sl_no ?? idx + 1}
                          </td>
                          <td className="p-3 font-bold text-slate-900 max-w-xs">{task.title}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{task.audit_code}</td>
                          <td className="p-3 font-bold text-sky-700">
                            {task.due_date ? `${MONTHS[(task.month || 1) - 1]} ${new Date(task.due_date).getDate() || 1}, ${task.year || 2026}` : `${MONTHS[(task.month || 1) - 1]} ${task.year || 2026}`}
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            {task.auditor_name ?? task.assigned_to_employee_number}
                          </td>
                          <td className="p-3 font-medium text-slate-700">{task.due_date}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-900 border border-indigo-300">
                              <FileCheck2 className="h-3.5 w-3.5 text-indigo-700" /> Under Review
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setDashboardTab("review_jobs")}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors shadow-2xs"
                                title="Review Audit Evidences"
                              >
                                <FileCheck2 className="h-3.5 w-3.5 text-indigo-700" /> Review
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!isAdmin) {
                                    toast.error("Access Denied: Only Admins can move audits from Under Review to Completed.");
                                    return;
                                  }
                                  if (typeof window !== "undefined") {
                                    const stored = localStorage.getItem("sakthi_excel_tasks_v8");
                                    if (stored) {
                                      try {
                                        let tasks = JSON.parse(stored);
                                        tasks = tasks.map((t: any) => {
                                          if (t.id === task.id || t.audit_code === task.audit_code) {
                                            return {
                                              ...t,
                                              status: "Completed",
                                              completion_date: new Date().toISOString().split("T")[0],
                                              final_result: "PASS / COMPLIANT",
                                            };
                                          }
                                          return t;
                                        });
                                        localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
                                        window.dispatchEvent(new Event("excel_tasks_updated"));
                                      } catch {}
                                    }
                                  }
                                  updateSubmittedAuditStatus(task.id, "Completed", "Marked as Completed by Admin Dashboard");
                                  toast.success(`Audit ${task.audit_code} moved to Audit Completed!`);
                                }}
                                disabled={!isAdmin}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all shadow-2xs ${
                                  !isAdmin
                                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                                }`}
                                title={!isAdmin ? "Admin access required" : "Move to Audit Completed"}
                              >
                                <Check className="h-3.5 w-3.5" /> Completed
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!isAdmin) {
                                    toast.error("Access Denied: Only Admins can move audits from Under Review to Deviations.");
                                    return;
                                  }
                                  if (typeof window !== "undefined") {
                                    const stored = localStorage.getItem("sakthi_excel_tasks_v8");
                                    if (stored) {
                                      try {
                                        let tasks = JSON.parse(stored);
                                        tasks = tasks.map((t: any) => {
                                          if (t.id === task.id || t.audit_code === task.audit_code) {
                                            return {
                                              ...t,
                                              status: "Deviation",
                                              final_result: "DEVIATION IDENTIFIED",
                                            };
                                          }
                                          return t;
                                        });
                                        localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
                                        window.dispatchEvent(new Event("excel_tasks_updated"));
                                      } catch {}
                                    }

                                    const storedDevs = localStorage.getItem("sakthi_deviations");
                                    let devs = storedDevs ? JSON.parse(storedDevs) : [];
                                    const newDevCode = (task.audit_code || task.id).replace("AUD-", "DEV-").replace("REV-", "DEV-");
                                    if (!devs.some((d: any) => d.dev_code === newDevCode || d.audit_id === task.id)) {
                                      devs.unshift({
                                        id: `dev-${Date.now()}`,
                                        audit_id: task.id,
                                        dev_code: newDevCode.startsWith("DEV-") ? newDevCode : `DEV-${newDevCode}`,
                                        description: `Deviation identified during Admin Audit Review for ${task.title}`,
                                        observed_condition: `Quality issue identified by Admin during verification of audit ${task.audit_code}`,
                                        location_operation: task.area,
                                        employee_number: task.assigned_to_employee_number,
                                        severity: "High",
                                        status: "Open",
                                        created_at: new Date().toISOString().split("T")[0],
                                        responsible_person: task.assigned_to_employee_number,
                                        department: task.area,
                                        corrective_action: "Action Assigned to QA / Line Supervisor",
                                        due_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
                                        closure_status: "Open",
                                        product_part_number: task.audit_code,
                                      });
                                      localStorage.setItem("sakthi_deviations", JSON.stringify(devs));
                                      window.dispatchEvent(new Event("sakthi_deviations_updated"));
                                    }
                                  }
                                  updateSubmittedAuditStatus(task.id, "Deviation", "Moved to Deviations by Admin Dashboard");
                                  toast.warning(`Deviation logged for ${task.audit_code}. Audit moved to Deviations!`);
                                }}
                                disabled={!isAdmin}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all shadow-2xs ${
                                  !isAdmin
                                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                    : "bg-rose-600 text-white hover:bg-rose-700 active:scale-95"
                                }`}
                                title={!isAdmin ? "Admin access required" : "Move to Deviations"}
                              >
                                <AlertTriangle className="h-3.5 w-3.5" /> Deviation
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {underReviewTasks.filter(filterByPlanSubView).length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-xs font-semibold text-slate-400 italic">
                            No reports currently under review for this timeframe.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── VIEW 4: AUDIT COMPLETED TABLE ── */}
              {selectedStatusView === "Audit Completed" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-14 text-center">SL. NO.</th>
                        <th className="p-3">PART NAME</th>
                        <th className="p-3">PART NUMBER</th>
                        <th className="p-3">AUDIT DATE</th>
                        <th className="p-3">AUDITOR</th>
                        <th className="p-3">COMPLETION DATE</th>
                        <th className="p-3">FINAL RESULT & SIGNATURE</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {completedTasks.filter(filterByPlanSubView).map((task, idx) => (
                        <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-mono font-bold text-slate-500">
                            {task.sl_no ?? idx + 1}
                          </td>
                          <td className="p-3 font-bold text-slate-900 max-w-xs">{task.title}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{task.audit_code}</td>
                          <td className="p-3 font-medium text-slate-700">{task.due_date}</td>
                          <td className="p-3 font-medium text-slate-700">{task.auditor_name ?? task.assigned_to_employee_number}</td>
                          <td className="p-3 font-medium text-slate-700">{task.completion_date ?? task.due_date}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 text-[11px] border border-emerald-300">
                              <Check className="h-3 w-3" /> {task.final_result ?? "APPROVED & SIGNED"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button asChild size="sm" variant="outline" className="border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-xs">
                              <Link to="/audit/$auditId" params={{ auditId: task.id }}>
                                View Signed Report
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── VIEW 5: DEVIATION TABLE ── */}
              {selectedStatusView === "Deviation" && (
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
              )}

              {/* ── VIEW 6: NO PRODUCTION TABLE ── */}
              {selectedStatusView === "No Production" && (
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
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              {lp.production_percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-600">{lp.threshold_percentage}%</td>
                          <td className="p-3">
                            <span className="rounded-md px-2.5 py-1 font-bold text-[11px] bg-purple-600 text-white">
                              NO PRODUCTION
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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

      {/* ── MODAL: ADMIN "+ ADD PLAN" (SERIAL NO, PART NAME, PART NUMBER, PLANNED MONTH & EXCEL ATTACHMENT) ── */}
      {(isAddPlanModalOpen || isEditModalOpen) && editingAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" /> {isAddPlanModalOpen ? "Add New Audit Plan" : `Edit Audit Plan [${editingAudit.audit_code}]`}
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
              <div className="grid grid-cols-2 gap-3">
                {/* 1. SERIAL NUMBER */}
                <div>
                  <label className="block font-extrabold uppercase text-slate-600 mb-1">Serial Number (SL. NO.)</label>
                  <input
                    type="text"
                    value={editingAudit.sl_no ?? ""}
                    onChange={(e) => setEditingAudit({ ...editingAudit, sl_no: e.target.value })}
                    placeholder="e.g. 1"
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* 2. PART NUMBER */}
                <div>
                  <label className="block font-extrabold uppercase text-slate-600 mb-1">Part Number</label>
                  <input
                    type="text"
                    value={editingAudit.audit_code}
                    onChange={(e) => setEditingAudit({ ...editingAudit, audit_code: e.target.value })}
                    placeholder="e.g. REV-007 / 45111 M 55TA0"
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-indigo-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. PART NAME */}
              <div>
                <label className="block font-extrabold uppercase text-slate-600 mb-1">Part Name</label>
                <input
                  type="text"
                  value={editingAudit.title}
                  onChange={(e) => setEditingAudit({ ...editingAudit, title: e.target.value })}
                  placeholder="e.g. Steering Knuckle Housing LH/RH – MPV"
                  className="w-full rounded-lg border border-slate-300 p-2 font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* PLANNED DATE (MONTH + DATE + YEAR) & 6 AUDIT CATEGORIES */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 space-y-2">
                <span className="font-extrabold uppercase text-[11px] text-sky-900">
                  Planned Month + Date + Year Selection *
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-[11px] uppercase text-slate-600 mb-1">Month</label>
                    <select
                      value={editingAudit.month}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        const d = editingAudit.due_date ? parseInt(editingAudit.due_date.split("-")[2] || "1", 10) : 1;
                        const y = editingAudit.year || new Date().getFullYear();
                        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                        setEditingAudit({ ...editingAudit, month: m, due_date: dateStr });
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 font-bold text-sky-800 bg-white"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m} ({idx + 1})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[11px] uppercase text-slate-600 mb-1">Date</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={editingAudit.due_date ? parseInt(editingAudit.due_date.split("-")[2] || "1", 10) : 1}
                      onChange={(e) => {
                        const d = Math.max(1, Math.min(31, Number(e.target.value)));
                        const m = editingAudit.month || 1;
                        const y = editingAudit.year || new Date().getFullYear();
                        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                        setEditingAudit({ ...editingAudit, due_date: dateStr });
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[11px] uppercase text-slate-600 mb-1">Year</label>
                    <input
                      type="number"
                      min={2020}
                      max={2035}
                      value={editingAudit.year || new Date().getFullYear()}
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        const m = editingAudit.month || 1;
                        const d = editingAudit.due_date ? parseInt(editingAudit.due_date.split("-")[2] || "1", 10) : 1;
                        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                        setEditingAudit({ ...editingAudit, year: y, due_date: dateStr });
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* AUDIT CATEGORY SELECT FOR ADMIN */}
              <div>
                <label className="block font-extrabold uppercase text-slate-600 mb-1">Audit Category</label>
                <select
                  value={editingAudit.audit_type}
                  onChange={(e) => setEditingAudit({ ...editingAudit, audit_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 font-bold text-slate-800 focus:border-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Product">Product Audit</option>
                  <option value="Revalidation">Revalidation Audit</option>
                  <option value="Dock Audit">Dock Audit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold uppercase text-slate-600 mb-1">Auditor Name / Emp ID</label>
                  <input
                    type="text"
                    value={editingAudit.auditor_name ?? editingAudit.assigned_to_employee_number}
                    onChange={(e) => setEditingAudit({ ...editingAudit, auditor_name: e.target.value, assigned_to_employee_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-extrabold uppercase text-slate-600 mb-1">Department / Line</label>
                  <input
                    type="text"
                    value={editingAudit.area}
                    onChange={(e) => setEditingAudit({ ...editingAudit, area: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* 5. ATTACHMENT FILE OPTION (UPLOAD EXCEL SHEET / SPEC DOCUMENT) */}
              <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-[11px] text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel Sheet / Spec File Attachment
                  </span>
                  {editingAudit.attached_file_name && (
                    <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                      File Attached
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-emerald-700 font-medium">
                  Attach Excel checklist (.xlsx, .csv) or spec document. Employees can click and view this attachment directly in Ongoing Audit.
                </p>

                <input
                  type="file"
                  ref={planFileInputRef}
                  onChange={handlePlanFileAttachmentChange}
                  accept=".xlsx,.xls,.csv,.pdf"
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => planFileInputRef.current?.click()}
                    className="bg-white border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100 text-xs gap-1.5 shadow-2xs"
                  >
                    <Upload className="h-3.5 w-3.5 text-emerald-600" /> Select Excel Sheet / Document
                  </Button>

                  {editingAudit.attached_file_name ? (
                    <span className="font-mono text-xs font-bold text-emerald-900 truncate">
                      {editingAudit.attached_file_name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No file selected</span>
                  )}
                </div>
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
                className="bg-emerald-600 text-white font-black hover:bg-emerald-700 text-xs gap-1.5 shadow-xs"
              >
                <Check className="h-4 w-4" /> Save Audit Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
