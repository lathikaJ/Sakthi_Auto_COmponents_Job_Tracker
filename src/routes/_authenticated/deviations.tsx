import React, { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Filter,
  Building2,
  X,
  FileText,
  ShieldCheck,
  Upload,
  Printer,
  AlertCircle,
  Download,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { authenticateAndGetSignature } from "@/lib/electronicSignatures";
import { getSubmittedAudits, updateSubmittedAuditStatus } from "@/lib/submittedAudits";

export const Route = createFileRoute("/_authenticated/deviations")({
  component: DeviationsPage,
});

export type DeviationItem = {
  id: string;
  audit_id?: string;
  dev_code: string;
  description: string; // Deviation Title
  observed_condition: string;
  location_operation: string; // Location / Plant / Line
  employee_number: string;
  severity: "Low" | "Medium" | "High" | "Critical"; // Severity
  status: "open" | "page1_submitted" | "page1_approved" | "page2_submitted" | "under_review" | "closed";
  corrective_action: string;
  recommended_action: string;
  created_at: string;

  // Page 1: Deviation Report Format Fields
  segregated_qty: string;
  ok_qty: string;
  ng_qty: string;
  root_cause: string;
  segregated_by: string; // Segregated By: Employee Name
  employee_signature?: string; // Segregated By: Signature
  approved_by: string; // Approved By: Approved Name
  approved_by_signature: string; // Approved By: Signature
  report_attached: boolean;

  // Page 1 Admin Approval
  page1_approved?: boolean;
  page1_approved_by?: string;
  page1_approved_at?: string;

  // Page 2: Root Cause & Corrective Action Report Fields
  page2_submitted?: boolean;
  page2_root_cause?: string;
  page2_corrective_action?: string;
  page2_preventive_action?: string;
  page2_responsible?: string;
  page2_target_date?: string;
  page2_attachment_name?: string;
  page2_submitted_at?: string;

  // Dual Approval
  both_approved?: boolean;
  final_approved_by?: string;
};

function DeviationsPage() {
  const { profile, isAdmin } = useAuth();
  const [deviations, setDeviations] = useState<DeviationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<1 | 2>(1); // Page 1 vs Page 2
  const [editingDevId, setEditingDevId] = useState<string | null>(null);
  const [viewReportDev, setViewReportDev] = useState<DeviationItem | null>(null);

  const empSigInputRef = useRef<HTMLInputElement>(null);
  const appSigInputRef = useRef<HTMLInputElement>(null);
  const page2FileInputRef = useRef<HTMLInputElement>(null);

  // Form State (Page 1 & Page 2 combined)
  const [formData, setFormData] = useState({
    audit_id: "",
    title: "",
    location: "Machine Shop - Line 1",
    severity: "High" as "Low" | "Medium" | "High" | "Critical",
    assigned_emp: profile?.employee_number || "688079",
    observed_condition: "",
    segregated_qty: "100",
    ok_qty: "95",
    ng_qty: "5",
    root_cause: "Tool wear out during long run machining causing dimensional variation beyond tolerance limits.",
    segregated_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
    employee_signature: "",
    approved_by: "KARTHIKEYAN C (690867)",
    approved_by_signature: "",

    // Page 2 fields
    page2_root_cause: "5-Why Root Cause Analysis: Insert tip micro-chipping due to coolant flow interruption at spindle unit #3.",
    page2_corrective_action: "Replaced tool insert, re-calibrated spindle unit, and re-inspected entire 100 pcs lot.",
    page2_preventive_action: "Installed automated coolant flow monitor with auto-shutoff sensor on Line 1.",
    page2_responsible: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
    page2_target_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    page2_attachment_name: "",
  });

  // Load registered signatures automatically if available
  useEffect(() => {
    const currentEmp = profile?.employee_number || "688079";
    const sigObj = authenticateAndGetSignature(currentEmp);
    if (sigObj?.signature_url) {
      setFormData((prev) => ({
        ...prev,
        employee_signature: sigObj.signature_url,
        approved_by_signature: sigObj.signature_url,
      }));
    }
  }, [profile?.employee_number]);

  // Load stored deviations
  const loadDeviations = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_deviations");
      if (stored) {
        try {
          const parsed: DeviationItem[] = JSON.parse(stored);
          const live = parsed.filter((d) => !d.id.startsWith("demo-dev-"));
          setDeviations(live);
          return;
        } catch {
          // Fall through
        }
      }
    }
    setDeviations([]);
  };

  useEffect(() => {
    loadDeviations();
    const handleUpdate = () => loadDeviations();
    window.addEventListener("sakthi_deviations_updated", handleUpdate);

    // Check pre-fill from audit execution (NOT OK clicked on inspection report)
    if (typeof window !== "undefined") {
      const prefillRaw = localStorage.getItem("sakthi_deviation_prefill");
      if (prefillRaw) {
        try {
          const prefill = JSON.parse(prefillRaw);
          setFormData((prev) => ({
            ...prev,
            audit_id: prefill.audit_id || "",
            title: prefill.title || "",
            observed_condition: prefill.observed_condition || "",
            location: prefill.location || "Audit Checkpoint",
            severity: prefill.severity || "High",
            assigned_emp: prefill.assigned_emp || profile?.employee_number || "688079",
            segregated_by: prefill.segregated_by || prev.segregated_by,
          }));
          setEditingDevId(null);
          setActiveTab(1);
          setIsModalOpen(true);
          localStorage.removeItem("sakthi_deviation_prefill");
        } catch {
          // Ignore
        }
      }
    }

    return () => window.removeEventListener("sakthi_deviations_updated", handleUpdate);
  }, []);

  const saveDeviationsList = async (updatedList: DeviationItem[]) => {
    setDeviations(updatedList);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_deviations", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("sakthi_deviations_updated"));
    }
  };

  // Quantity Validation Rule: Segregated Quantity = OK Quantity + NG Quantity
  const numSeg = parseInt(formData.segregated_qty || "0", 10);
  const numOK = parseInt(formData.ok_qty || "0", 10);
  const numNG = parseInt(formData.ng_qty || "0", 10);
  const isQtyValid = !isNaN(numSeg) && !isNaN(numOK) && !isNaN(numNG) && numSeg > 0 && (numOK + numNG === numSeg);

  // Form Page 1 Validation
  const isPage1Valid =
    formData.title.trim() !== "" &&
    formData.location.trim() !== "" &&
    formData.segregated_qty.trim() !== "" &&
    formData.ok_qty.trim() !== "" &&
    formData.ng_qty.trim() !== "" &&
    formData.root_cause.trim() !== "" &&
    formData.segregated_by.trim() !== "" &&
    formData.approved_by.trim() !== "" &&
    Boolean(formData.approved_by_signature) &&
    isQtyValid;

  // Form Page 2 Validation
  const isPage2Valid =
    formData.page2_root_cause.trim() !== "" &&
    formData.page2_corrective_action.trim() !== "" &&
    formData.page2_preventive_action.trim() !== "" &&
    formData.page2_responsible.trim() !== "";

  // Signature & File Handlers
  const handleEmpSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file for Employee Signature.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setFormData((prev) => ({ ...prev, employee_signature: evt.target?.result as string }));
        toast.success("Employee Signature uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAppSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file for Approved By Signature.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setFormData((prev) => ({ ...prev, approved_by_signature: evt.target?.result as string }));
        toast.success("Approved By E-Signature uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePage2FileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, page2_attachment_name: file.name }));
      toast.success(`Attached file: ${file.name}`);
    }
  };

  // Submit Page 1 (Deviation Report Format)
  const handleSubmitPage1 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPage1Valid) {
      if (!isQtyValid) {
        toast.error(`Quantity Validation Failed: Segregated Quantity (${numSeg}) must equal OK Qty (${numOK}) + NG Qty (${numNG}) = ${numOK + numNG}.`);
      } else {
        toast.error("Please complete all mandatory fields for Page 1.");
      }
      return;
    }

    if (editingDevId) {
      // Update existing deviation record
      const updated = deviations.map((d) => {
        if (d.id === editingDevId) {
          return {
            ...d,
            description: formData.title,
            location_operation: formData.location,
            severity: formData.severity,
            observed_condition: formData.observed_condition || d.observed_condition,
            segregated_qty: formData.segregated_qty,
            ok_qty: formData.ok_qty,
            ng_qty: formData.ng_qty,
            root_cause: formData.root_cause,
            segregated_by: formData.segregated_by,
            employee_signature: formData.employee_signature || d.employee_signature,
            approved_by: formData.approved_by,
            approved_by_signature: formData.approved_by_signature || d.approved_by_signature,
          };
        }
        return d;
      });
      await saveDeviationsList(updated);
      setIsModalOpen(false);
      toast.success("Page 1 [Deviation Report Format] updated successfully!");
    } else {
      // Create new deviation record (Status: page1_submitted)
      const newCode = `DEV-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newDev: DeviationItem = {
        id: `dev-${Date.now()}`,
        audit_id: formData.audit_id || `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        dev_code: newCode,
        description: formData.title,
        location_operation: formData.location,
        severity: formData.severity,
        employee_number: formData.assigned_emp,
        status: "page1_submitted", // Moves to Deviations Icon / module under review
        observed_condition: formData.observed_condition || "Non-conformance identified during process audit.",
        corrective_action: formData.page2_corrective_action,
        recommended_action: "Preventative tool replacement and process parameter audit.",
        created_at: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),

        segregated_qty: formData.segregated_qty,
        ok_qty: formData.ok_qty,
        ng_qty: formData.ng_qty,
        root_cause: formData.root_cause,
        segregated_by: formData.segregated_by,
        employee_signature: formData.employee_signature || formData.approved_by_signature,
        approved_by: formData.approved_by,
        approved_by_signature: formData.approved_by_signature,
        report_attached: true,
        page1_approved: false,
        page2_submitted: false,
      };

      const updated = [newDev, ...deviations];
      await saveDeviationsList(updated);
      setIsModalOpen(false);
      toast.success(`Page 1 [Deviation Report Format] ${newCode} submitted! Moves to Deviations icon for Admin Page 1 approval.`);
    }
  };

  // Admin approves Page 1
  const handleAdminApprovePage1 = async (dev: DeviationItem) => {
    if (!isAdmin) {
      toast.error("Access Denied: Only Admin can approve Page 1 of Deviation Report.");
      return;
    }
    const adminSig = authenticateAndGetSignature("690867");
    const updated = deviations.map((d) => {
      if (d.id === dev.id) {
        return {
          ...d,
          page1_approved: true,
          page1_approved_by: adminSig?.employee_name || "KARTHIKEYAN C (690867)",
          page1_approved_at: new Date().toISOString(),
          status: "page1_approved" as const,
        };
      }
      return d;
    });
    await saveDeviationsList(updated);
    toast.success(`Page 1 of Deviation ${dev.dev_code} Approved by Admin! User can now download Page 1 and fill Page 2.`);
  };

  // Submit Page 2 (Root Cause & Corrective Action Report) -> Moves both reports to Admin Under Review
  const handleSubmitPage2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPage2Valid) {
      toast.error("Please complete all mandatory fields for Page 2 (Root Cause & CAPA).");
      return;
    }

    if (!editingDevId) {
      toast.error("Please save Page 1 first before submitting Page 2.");
      return;
    }

    const currentDev = deviations.find((d) => d.id === editingDevId);
    if (!currentDev) return;

    const nowIso = new Date().toISOString();

    const updated = deviations.map((d) => {
      if (d.id === editingDevId) {
        return {
          ...d,
          page2_submitted: true,
          page2_root_cause: formData.page2_root_cause,
          page2_corrective_action: formData.page2_corrective_action,
          page2_preventive_action: formData.page2_preventive_action,
          page2_responsible: formData.page2_responsible,
          page2_target_date: formData.page2_target_date,
          page2_attachment_name: formData.page2_attachment_name || "RCA_CAPA_Report.pdf",
          page2_submitted_at: nowIso,
          status: "under_review" as const, // Both reports move to Admin Under Review
        };
      }
      return d;
    });

    await saveDeviationsList(updated);

    // Also update linked Inspection Audit in sakthi_submitted_audits_v2 to "Under Review"
    if (currentDev.audit_id) {
      updateSubmittedAuditStatus(currentDev.audit_id, "Under Review", "Page 2 Root Cause & CAPA submitted. Both reports under Admin review.");
    }

    setIsModalOpen(false);
    toast.success(`Page 2 (Root Cause & CAPA) submitted! Both Inspection Report and Deviation Report are now Under Review to Admin.`);
  };

  // Admin Dual Approval (Approves both reports: Inspection moves to Completed, Deviation remains in Deviations Icon, Count +1)
  const handleAdminApproveBoth = async (dev: DeviationItem) => {
    if (!isAdmin) {
      toast.error("Access Denied: Only Admin can perform final dual approval.");
      return;
    }
    const adminSig = authenticateAndGetSignature("690867");

    // 1. Update Deviation Report in sakthi_deviations -> status = "closed", both_approved = true
    const updatedDevs = deviations.map((d) => {
      if (d.id === dev.id) {
        return {
          ...d,
          status: "closed" as const,
          both_approved: true,
          final_approved_by: adminSig?.employee_name || "KARTHIKEYAN C (690867)",
        };
      }
      return d;
    });
    await saveDeviationsList(updatedDevs);

    // 2. Update linked Inspection Report in sakthi_submitted_audits_v2 & sakthi_excel_tasks_v8 -> status = "Completed"
    if (dev.audit_id) {
      updateSubmittedAuditStatus(dev.audit_id, "Completed", `Approved & Signed by Admin (${adminSig?.employee_name || "KARTHIKEYAN C"})`);
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_excel_tasks_v8");
      if (stored) {
        try {
          let tasks = JSON.parse(stored);
          tasks = tasks.map((t: any) => {
            if (t.id === dev.audit_id || t.audit_code === dev.audit_id || t.audit_code === dev.dev_code.replace("DEV-", "AUD-")) {
              return {
                ...t,
                status: "Completed",
                completion_date: new Date().toISOString().split("T")[0],
                final_result: "PASS / COMPLIANT (DEVIATION RESOLVED)",
              };
            }
            return t;
          });
          localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
          window.dispatchEvent(new Event("excel_tasks_updated"));
        } catch {
          // Ignore
        }
      }
    }

    toast.success(`Both Reports Approved by Admin! Inspection report moved to 'Completed Audit'. Deviation report ${dev.dev_code} remains in Deviations icon with count incremented.`);
  };

  const openModalForNew = () => {
    setEditingDevId(null);
    setActiveTab(1);
    setFormData({
      audit_id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      title: "",
      location: "Machine Shop - Line 1",
      severity: "High",
      assigned_emp: profile?.employee_number || "688079",
      observed_condition: "",
      segregated_qty: "100",
      ok_qty: "95",
      ng_qty: "5",
      root_cause: "Tool wear out during long run machining causing dimensional variation beyond tolerance limits.",
      segregated_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
      employee_signature: "",
      approved_by: "KARTHIKEYAN C (690867)",
      approved_by_signature: "",
      page2_root_cause: "5-Why Root Cause Analysis: Insert tip micro-chipping due to coolant flow interruption at spindle unit #3.",
      page2_corrective_action: "Replaced tool insert, re-calibrated spindle unit, and re-inspected entire 100 pcs lot.",
      page2_preventive_action: "Installed automated coolant flow monitor with auto-shutoff sensor on Line 1.",
      page2_responsible: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
      page2_target_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      page2_attachment_name: "",
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (dev: DeviationItem, initialTab: 1 | 2 = 1) => {
    setEditingDevId(dev.id);
    setActiveTab(initialTab);
    setFormData({
      audit_id: dev.audit_id || "",
      title: dev.description,
      location: dev.location_operation,
      severity: dev.severity,
      assigned_emp: dev.employee_number,
      observed_condition: dev.observed_condition,
      segregated_qty: dev.segregated_qty || "100",
      ok_qty: dev.ok_qty || "95",
      ng_qty: dev.ng_qty || "5",
      root_cause: dev.root_cause || "",
      segregated_by: dev.segregated_by || "",
      employee_signature: dev.employee_signature || "",
      approved_by: dev.approved_by || "KARTHIKEYAN C (690867)",
      approved_by_signature: dev.approved_by_signature || "",
      page2_root_cause: dev.page2_root_cause || "5-Why Root Cause Analysis: Insert tip micro-chipping due to coolant flow interruption at spindle unit #3.",
      page2_corrective_action: dev.page2_corrective_action || dev.corrective_action || "Replaced tool insert and re-calibrated spindle unit.",
      page2_preventive_action: dev.page2_preventive_action || "Installed automated coolant flow monitor with auto-shutoff sensor.",
      page2_responsible: dev.page2_responsible || dev.segregated_by || "SILAMBARASAN S (688079)",
      page2_target_date: dev.page2_target_date || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      page2_attachment_name: dev.page2_attachment_name || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteDeviation = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only Admin can delete deviation records.");
      return;
    }
    const updated = deviations.filter((d) => d.id !== id);
    await saveDeviationsList(updated);
    toast.info("Deviation record removed by Admin.");
  };

  const filteredDeviations = deviations.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.dev_code.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.location_operation.toLowerCase().includes(q) ||
        d.employee_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCount = deviations.filter((d) => d.status === "open" || d.status === "page1_submitted").length;
  const page1ApprovedCount = deviations.filter((d) => d.status === "page1_approved" || d.page1_approved).length;
  const reviewCount = deviations.filter((d) => d.status === "under_review" || d.status === "page2_submitted").length;
  const closedCount = deviations.filter((d) => d.status === "closed" || d.both_approved).length;

  return (
    <AppShell
      title="Plant Deviation Tracker (2-Page CAPA Workflow)"
      description="Record non-conformances across 2-page formats: Page 1 (Deviation Format) & Page 2 (Root Cause & Corrective Action) with multi-stage Admin approval."
    >
      <div className="space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Plant Non-Conformance & Deviation Register
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              2-Page Deviation Life Cycle: Page 1 (Deviation Format) $\rightarrow$ Admin Page 1 Approval $\rightarrow$ User Page 1 Download $\rightarrow$ Page 2 (RCA & CAPA) $\rightarrow$ Dual Admin Approval.
            </p>
          </div>

          <Button
            onClick={openModalForNew}
            className="gap-2 bg-brand font-bold text-white hover:bg-brand-hover shadow-sm text-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create 2-Page Deviation Report
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Logged Deviations</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">{deviations.length}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-amber-700 uppercase flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Page 1 Submitted / Open
            </div>
            <div className="mt-1 text-2xl font-extrabold text-amber-900">{openCount}</div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-sky-700 uppercase flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Page 2 / Under Review
            </div>
            <div className="mt-1 text-2xl font-extrabold text-sky-900">{reviewCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved & Completed
            </div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-900">{closedCount}</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All ({deviations.length})
            </button>
            <button
              onClick={() => setStatusFilter("page1_submitted")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "page1_submitted" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Page 1 Submitted ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter("page1_approved")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "page1_approved" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-800 hover:bg-sky-100"
              }`}
            >
              Page 1 Approved ({page1ApprovedCount})
            </button>
            <button
              onClick={() => setStatusFilter("under_review")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "under_review" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-800 hover:bg-purple-100"
              }`}
            >
              Both Under Review ({reviewCount})
            </button>
            <button
              onClick={() => setStatusFilter("closed")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "closed" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Dual Approved ({closedCount})
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search deviations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-slate-300 pl-9 text-xs bg-white text-slate-900 font-medium"
            />
          </div>
        </div>

        {/* Deviations Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                  <th className="p-3 w-28 font-bold">Dev Code</th>
                  <th className="p-3 min-w-[200px] font-bold">Deviation Title</th>
                  <th className="p-3 w-32 font-bold">Location</th>
                  <th className="p-3 w-24 font-bold">Segregated Qty</th>
                  <th className="p-3 w-32 font-bold">Page 1 Status</th>
                  <th className="p-3 w-32 font-bold">Page 2 Status</th>
                  <th className="p-3 w-44 font-bold text-center">Actions & Download</th>
                  {isAdmin && <th className="p-3 text-center w-16 font-bold">Delete</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {filteredDeviations.map((dev) => {
                  return (
                    <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-brand">{dev.dev_code}</td>
                      <td className="p-3 space-y-1">
                        <div className="font-bold text-slate-900 text-sm">{dev.description}</div>
                        <div className="text-xs text-slate-600 font-medium line-clamp-1">
                          Root Cause: {dev.root_cause || dev.observed_condition}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {dev.location_operation}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {dev.segregated_qty || "100"} PCS
                      </td>
                      <td className="p-3">
                        {dev.page1_approved ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Page 1 Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                            <Clock className="h-3 w-3" /> Page 1 Submitted
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {dev.both_approved || dev.status === "closed" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Dual Approved
                          </span>
                        ) : dev.page2_submitted || dev.status === "under_review" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 border border-purple-300">
                            <Clock className="h-3 w-3" /> Under Admin Review
                          </span>
                        ) : dev.page1_approved ? (
                          <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-300">
                            Ready for Page 2
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Awaiting Page 1 Approval</span>
                        )}
                      </td>
                      <td className="p-3 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* View Report Button */}
                          <button
                            type="button"
                            onClick={() => setViewReportDev(dev)}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-extrabold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <FileText className="h-3 w-3 text-amber-600" /> View Report
                          </button>

                          {/* Admin Approve Page 1 Button */}
                          {isAdmin && !dev.page1_approved && (
                            <button
                              type="button"
                              onClick={() => handleAdminApprovePage1(dev)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Approve P1
                            </button>
                          )}

                          {/* Download Approved Page 1 Button */}
                          {dev.page1_approved && (
                            <button
                              type="button"
                              onClick={() => setViewReportDev(dev)}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Download Approved Deviation Report (Page 1)"
                            >
                              <Download className="h-3 w-3 text-emerald-600" /> Download P1
                            </button>
                          )}

                          {/* Fill & Submit Page 2 Button */}
                          {dev.page1_approved && !dev.both_approved && dev.status !== "closed" && (
                            <button
                              type="button"
                              onClick={() => openModalForEdit(dev, 2)}
                              className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-sky-700 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Plus className="h-3 w-3" /> Fill Page 2
                            </button>
                          )}

                          {/* Admin Dual Final Approval Button */}
                          {isAdmin && dev.page2_submitted && !dev.both_approved && dev.status !== "closed" && (
                            <button
                              type="button"
                              onClick={() => handleAdminApproveBoth(dev)}
                              className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-purple-700 transition-colors cursor-pointer shadow-2xs"
                            >
                              <ShieldCheck className="h-3 w-3" /> Approve Both
                            </button>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            onClick={() => handleDeleteDeviation(dev.id)}
                            title="Delete Record (Admin Only)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredDeviations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm font-semibold text-slate-500">
                      No deviation records match your criteria. Click '+ Create 2-Page Deviation Report' to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: 2-PAGE DEVIATION REPORT WIZARD (PAGE 1 & PAGE 2) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-3xl my-8 rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500 p-2 text-white shadow-xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      OFFICIAL 2-PAGE DEVIATION REPORT WIZARD
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                      Page 1: Deviation Format $\rightarrow$ Page 2: Root Cause & Corrective Action
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Page 1 vs Page 2 Tab Selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab(1)}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 1
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white font-extrabold">1</span>
                  Page 1: Deviation Report Format
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(2)}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 2
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] text-white font-extrabold">2</span>
                  Page 2: Root Cause & Corrective Action
                </button>
              </div>

              {/* ── PAGE 1 CONTENT: DEVIATION REPORT FORMAT ── */}
              {activeTab === 1 && (
                <form onSubmit={handleSubmitPage1} className="space-y-4 text-xs">
                  {/* DEVIATION TITLE */}
                  <div>
                    <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                      DEVIATION TITLE *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Steering Knuckle Bore Oversize Non-Conformance"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="border-slate-300 text-xs font-bold text-slate-900 bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* LOCATION / PLANT / LINE */}
                  <div>
                    <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                      LOCATION / PLANT / LINE *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Machine Shop Line 1 / Plant 2"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="border-slate-300 text-xs font-bold text-slate-900 bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* SEVERITY */}
                  <div>
                    <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                      SEVERITY *
                    </label>
                    <div className="flex items-center gap-6 rounded-lg border border-slate-300 bg-slate-50/70 p-2.5">
                      {(["Low", "Medium", "High", "Critical"] as const).map((sev) => (
                        <label key={sev} className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-800">
                          <input
                            type="radio"
                            name="severity"
                            value={sev}
                            checked={formData.severity === sev}
                            onChange={() => setFormData({ ...formData, severity: sev })}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <span>☐ {sev}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* QUANTITY BREAKDOWN */}
                  <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase tracking-wider text-slate-800 text-[11px]">
                        QUANTITY BREAKDOWN *
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Formula: Segregated Qty = OK Qty + NG Qty
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                          SEGREGATED QUANTITY *
                        </label>
                        <Input
                          required
                          type="number"
                          min={1}
                          value={formData.segregated_qty}
                          onChange={(e) => setFormData({ ...formData, segregated_qty: e.target.value })}
                          placeholder="100"
                          className="bg-white border-slate-300 font-mono font-black text-slate-900 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-emerald-800 mb-1 text-[11px]">
                          OK QUANTITY *
                        </label>
                        <Input
                          required
                          type="number"
                          min={0}
                          value={formData.ok_qty}
                          onChange={(e) => setFormData({ ...formData, ok_qty: e.target.value })}
                          placeholder="95"
                          className="bg-white border-emerald-300 font-mono font-black text-emerald-900 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-rose-800 mb-1 text-[11px]">
                          NG QUANTITY *
                        </label>
                        <Input
                          required
                          type="number"
                          min={0}
                          value={formData.ng_qty}
                          onChange={(e) => setFormData({ ...formData, ng_qty: e.target.value })}
                          placeholder="5"
                          className="bg-white border-rose-300 font-mono font-black text-rose-900 text-sm"
                        />
                      </div>
                    </div>

                    {/* QUANTITY VALIDATION BOX */}
                    <div className="mt-2 rounded-lg border p-2.5 text-xs font-bold transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="uppercase text-[10px] tracking-wider text-slate-600">QUANTITY VALIDATION</span>
                        <span className="font-mono text-[11px]">Formula: Segregated = OK + NG</span>
                      </div>

                      {isQtyValid ? (
                        <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md p-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>
                            Quantity Validation Passed: OK Qty ({numOK}) + NG Qty ({numNG}) = Segregated Qty ({numSeg})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-800 bg-rose-50 border border-rose-300 rounded-md p-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>
                            Quantity Validation Error: Segregated Qty ({numSeg}) does not match OK Qty ({numOK}) + NG Qty ({numNG}) = {numOK + numNG}.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ROOT CAUSE / OBSERVED CONDITION */}
                  <div>
                    <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                      DEFECT / OBSERVED CONDITION *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Enter observed non-conformance details..."
                      value={formData.root_cause}
                      onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                      className="w-full rounded-md border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* SIGNATURES SECTION (SEGREGATED BY & APPROVED BY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3">
                    {/* SEGREGATED BY */}
                    <div className="space-y-2 border-r border-slate-200 pr-2">
                      <span className="font-black uppercase text-slate-800 text-[11px]">
                        SEGREGATED BY *
                      </span>
                      <Input
                        required
                        value={formData.segregated_by}
                        onChange={(e) => setFormData({ ...formData, segregated_by: e.target.value })}
                        placeholder="Employee Name"
                        className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                      />
                      <input type="file" ref={empSigInputRef} onChange={handleEmpSignatureUpload} accept="image/*" className="hidden" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600">Signature:</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => empSigInputRef.current?.click()}
                          className="h-6 text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-1.5 cursor-pointer"
                        >
                          <Upload className="h-3 w-3 mr-1" /> Upload Signature
                        </Button>
                      </div>
                      {formData.employee_signature ? (
                        <div className="rounded border border-slate-300 bg-white p-1 flex items-center gap-2">
                          <img src={formData.employee_signature} alt="Employee Signature" className="h-8 w-auto object-contain max-w-[140px]" />
                          <span className="text-[9px] text-emerald-700 font-bold">✓ Signed</span>
                        </div>
                      ) : (
                        <div className="h-8 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          Signature Required
                        </div>
                      )}
                    </div>

                    {/* APPROVED BY */}
                    <div className="space-y-2 pl-1">
                      <span className="font-black uppercase text-slate-800 text-[11px]">
                        APPROVED BY *
                      </span>
                      <Input
                        required
                        value={formData.approved_by}
                        onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                        placeholder="Approved Name"
                        className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                      />
                      <input type="file" ref={appSigInputRef} onChange={handleAppSignatureUpload} accept="image/*" className="hidden" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600">Signature:</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => appSigInputRef.current?.click()}
                          className="h-6 text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-1.5 cursor-pointer"
                        >
                          <Upload className="h-3 w-3 mr-1" /> Upload E-Signature
                        </Button>
                      </div>
                      {formData.approved_by_signature ? (
                        <div className="rounded border border-slate-300 bg-white p-1 flex items-center gap-2">
                          <img src={formData.approved_by_signature} alt="Approved By Signature" className="h-8 w-auto object-contain max-w-[140px]" />
                          <span className="text-[9px] text-emerald-700 font-bold">✓ Verified</span>
                        </div>
                      ) : (
                        <div className="h-8 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          E-Signature Required
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Page 1 Button Bar */}
                  <div className="border-t border-slate-300 pt-3 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Submitting Page 1 registers the report in the <strong>Deviations icon</strong> for Admin approval.
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        className="border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isPage1Valid}
                        className={`text-xs font-black text-white shadow-md transition-all ${
                          isPage1Valid
                            ? "bg-amber-600 hover:bg-amber-700 cursor-pointer"
                            : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        Save & Submit Page 1 (To Deviations Icon)
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* ── PAGE 2 CONTENT: ROOT CAUSE & CORRECTIVE ACTION REPORT ── */}
              {activeTab === 2 && (
                <form onSubmit={handleSubmitPage2} className="space-y-4 text-xs">
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 flex items-center justify-between text-sky-900">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-sky-600" />
                      Page 2: Root Cause Analysis (5-Why / 8D) & Corrective Action Report (CAPA)
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-sky-200 text-sky-900 px-2 py-0.5 rounded">
                      Page 2 of 2
                    </span>
                  </div>

                  {/* ROOT CAUSE (5-WHY ANALYSIS) */}
                  <div>
                    <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                      ROOT CAUSE ANALYSIS (5-WHY / 8D METHODOLOGY) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Detail the 5-Why root cause analysis..."
                      value={formData.page2_root_cause}
                      onChange={(e) => setFormData({ ...formData, page2_root_cause: e.target.value })}
                      className="w-full rounded-md border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* CORRECTIVE ACTION */}
                  <div>
                    <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                      CORRECTIVE ACTION TAKEN (CAPA) *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Specify immediate corrective actions taken on process/part..."
                      value={formData.page2_corrective_action}
                      onChange={(e) => setFormData({ ...formData, page2_corrective_action: e.target.value })}
                      className="w-full rounded-md border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* PREVENTIVE ACTION */}
                  <div>
                    <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                      PREVENTIVE ACTION (PREVENT RECURRENCE) *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Specify long-term preventive controls implemented..."
                      value={formData.page2_preventive_action}
                      onChange={(e) => setFormData({ ...formData, page2_preventive_action: e.target.value })}
                      className="w-full rounded-md border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* RESPONSIBILITY & TARGET DATE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                        RESPONSIBLE PERSON *
                      </label>
                      <Input
                        required
                        value={formData.page2_responsible}
                        onChange={(e) => setFormData({ ...formData, page2_responsible: e.target.value })}
                        placeholder="e.g. SILAMBARASAN S (688079)"
                        className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                        TARGET COMPLETION DATE *
                      </label>
                      <Input
                        required
                        type="date"
                        value={formData.page2_target_date}
                        onChange={(e) => setFormData({ ...formData, page2_target_date: e.target.value })}
                        className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* FILE ATTACHMENT / UPLOAD */}
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center space-y-2">
                    <input type="file" ref={page2FileInputRef} onChange={handlePage2FileUpload} className="hidden" />
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-5 w-5 text-sky-600" />
                      <span className="font-bold text-slate-800 text-xs">
                        Attach Supporting RCA / 8D PDF or Document
                      </span>
                    </div>
                    {formData.page2_attachment_name ? (
                      <div className="text-xs font-bold text-emerald-700 bg-emerald-50 py-1 px-3 rounded-full inline-block border border-emerald-300">
                        Attached: {formData.page2_attachment_name}
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => page2FileInputRef.current?.click()}
                        className="h-7 text-xs font-bold border-slate-300 cursor-pointer"
                      >
                        Choose File to Upload
                      </Button>
                    )}
                  </div>

                  {/* Submit Page 2 Bar */}
                  <div className="border-t border-slate-300 pt-3 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Submitting Page 2 moves <strong>both reports (Inspection + Deviation)</strong> to Admin <strong>Under Review</strong>.
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        className="border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isPage2Valid}
                        className={`text-xs font-black text-white shadow-md transition-all ${
                          isPage2Valid
                            ? "bg-sky-600 hover:bg-sky-700 cursor-pointer"
                            : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        Submit & Upload Page 2 (Both Reports $\rightarrow$ Admin Review)
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL: VIEW & PRINT OFFICIAL DEVIATION REPORT */}
        {viewReportDev && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-3xl my-8 rounded-2xl border border-slate-300 bg-white p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    DEVIATION REPORT
                  </h2>
                  <p className="text-xs font-bold text-slate-500 font-mono">
                    DOCUMENT CODE: {viewReportDev.dev_code} | AUDIT REF: {viewReportDev.audit_id || "AUD-MSIL-01"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="gap-1.5 text-xs font-bold border-slate-300 cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-300"
                  >
                    <Printer className="h-4 w-4" /> Download / Print Approved Report
                  </Button>
                  <button
                    onClick={() => setViewReportDev(null)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 2-PAGE PRINTABLE VIEW */}
              <div className="border-2 border-slate-900 rounded-lg overflow-hidden text-xs space-y-4 p-4 bg-white">
                <div className="text-center border-b border-slate-300 pb-2">
                  <h3 className="font-black text-sm uppercase text-slate-900">PAGE 1: DEVIATION REPORT FORMAT</h3>
                </div>

                <div className="grid grid-cols-3 border border-slate-900 bg-white">
                  <div className="p-2.5 font-black uppercase bg-slate-100 border-r border-slate-900">DEVIATION TITLE</div>
                  <div className="p-2.5 col-span-2 font-bold">{viewReportDev.description}</div>
                </div>

                <div className="grid grid-cols-3 border border-slate-900 bg-white">
                  <div className="p-2.5 font-black uppercase bg-slate-100 border-r border-slate-900">LOCATION / PLANT / LINE</div>
                  <div className="p-2.5 col-span-2 font-bold">{viewReportDev.location_operation}</div>
                </div>

                <div className="grid grid-cols-3 border border-slate-900 bg-white">
                  <div className="p-2.5 font-black uppercase bg-slate-100 border-r border-slate-900">SEVERITY</div>
                  <div className="p-2.5 col-span-2 font-bold">{viewReportDev.severity}</div>
                </div>

                <div className="grid grid-cols-3 border border-slate-900 bg-white">
                  <div className="p-2.5 font-black uppercase bg-slate-100 border-r border-slate-900">SEGREGATED QTY</div>
                  <div className="p-2.5 col-span-2 font-mono font-black">{viewReportDev.segregated_qty || "100"} PCS (OK: {viewReportDev.ok_qty || "95"}, NG: {viewReportDev.ng_qty || "5"})</div>
                </div>

                <div className="grid grid-cols-2 border border-slate-900 bg-white">
                  <div className="p-3 border-r border-slate-900 space-y-1">
                    <p className="font-black uppercase text-slate-900">SEGREGATED BY</p>
                    <p className="font-bold">{viewReportDev.segregated_by}</p>
                    {viewReportDev.employee_signature && (
                      <img src={viewReportDev.employee_signature} alt="Signature" className="h-8 max-w-[120px] object-contain border p-1" />
                    )}
                  </div>

                  <div className="p-3 space-y-1">
                    <p className="font-black uppercase text-slate-900">ADMIN PAGE 1 APPROVAL</p>
                    <p className="font-bold text-emerald-800">
                      {viewReportDev.page1_approved ? `✓ Approved by ${viewReportDev.page1_approved_by || "Admin Lead"}` : "Pending Admin Page 1 Approval"}
                    </p>
                    {viewReportDev.approved_by_signature && (
                      <img src={viewReportDev.approved_by_signature} alt="Admin Signature" className="h-8 max-w-[120px] object-contain border p-1" />
                    )}
                  </div>
                </div>

                {/* PAGE 2 SECTION */}
                <div className="text-center border-b border-t border-slate-300 py-2 mt-6">
                  <h3 className="font-black text-sm uppercase text-slate-900">PAGE 2: ROOT CAUSE & CORRECTIVE ACTION REPORT (CAPA)</h3>
                </div>

                <div className="grid grid-cols-3 border border-slate-900 bg-white">
                  <div className="p-2.5 font-black uppercase bg-slate-100 border-r border-slate-900">ROOT CAUSE (5-WHY)</div>
                  <div className="p-2.5 col-span-2 font-medium">{viewReportDev.page2_root_cause || viewReportDev.root_cause || "5-Why Analysis complete."}</div>
                </div>

                <div className="grid grid-cols-3 border border-slate-900 bg-white">
                  <div className="p-2.5 font-black uppercase bg-slate-100 border-r border-slate-900">CORRECTIVE ACTION (CAPA)</div>
                  <div className="p-2.5 col-span-2 font-medium">{viewReportDev.page2_corrective_action || viewReportDev.corrective_action || "Tool replacement and re-inspection completed."}</div>
                </div>

                <div className="grid grid-cols-3 border border-slate-900 bg-white">
                  <div className="p-2.5 font-black uppercase bg-slate-100 border-r border-slate-900">PREVENTIVE ACTION</div>
                  <div className="p-2.5 col-span-2 font-medium">{viewReportDev.page2_preventive_action || "Automated coolant sensor installed."}</div>
                </div>

                <div className="grid grid-cols-2 border border-slate-900 bg-white">
                  <div className="p-2.5 font-bold">Responsibility: {viewReportDev.page2_responsible || viewReportDev.segregated_by}</div>
                  <div className="p-2.5 font-bold">Target Date: {viewReportDev.page2_target_date || new Date().toISOString().split("T")[0]}</div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-bold text-slate-500">
                  Workflow Status: <span className="uppercase text-purple-800 font-black">{viewReportDev.status.replace("_", " ")}</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewReportDev(null)}
                  className="text-xs font-extrabold border-slate-300 cursor-pointer"
                >
                  Close Document
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
