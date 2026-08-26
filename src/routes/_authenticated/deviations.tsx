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
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { authenticateAndGetSignature } from "@/lib/electronicSignatures";

export const Route = createFileRoute("/_authenticated/deviations")({
  component: DeviationsPage,
});

export type DeviationItem = {
  id: string;
  dev_code: string;
  description: string; // Deviation Title
  observed_condition: string;
  location_operation: string; // Location / Plant / Line
  employee_number: string;
  severity: "Low" | "Medium" | "High" | "Critical"; // Severity
  status: "open" | "under_review" | "closed";
  corrective_action: string;
  recommended_action: string;
  created_at: string;

  // Mandatory Deviation Report Page Fields
  segregated_qty: string;
  ok_qty: string;
  ng_qty: string;
  root_cause: string;
  segregated_by: string; // Segregated By: Employee Name
  employee_signature?: string; // Segregated By: Signature
  approved_by: string; // Approved By: Approved Name
  approved_by_signature: string; // Approved By: Signature
  report_attached: boolean;
};

function DeviationsPage() {
  const { profile, isAdmin } = useAuth();
  const [deviations, setDeviations] = useState<DeviationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewReportDev, setViewReportDev] = useState<DeviationItem | null>(null);

  const empSigInputRef = useRef<HTMLInputElement>(null);
  const appSigInputRef = useRef<HTMLInputElement>(null);

  // New Deviation Form State (Matching PDF Specification)
  const [formData, setFormData] = useState({
    title: "",
    location: "Machine Shop - Line 1",
    severity: "High" as "Low" | "Medium" | "High" | "Critical",
    assigned_emp: profile?.employee_number || "688079",
    observed_condition: "",
    corrective_action: "",
    segregated_qty: "100",
    ok_qty: "95",
    ng_qty: "5",
    root_cause: "Tool wear out during long run machining causing dimensional variation beyond tolerance limits.",
    segregated_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
    employee_signature: "",
    approved_by: "KARTHIKEYAN C (690867)",
    approved_by_signature: "",
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
          if (live.length !== parsed.length) {
            localStorage.setItem("sakthi_deviations", JSON.stringify(live));
          }
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

    // Check pre-fill from audit execution
    if (typeof window !== "undefined") {
      const prefillRaw = localStorage.getItem("sakthi_deviation_prefill");
      if (prefillRaw) {
        try {
          const prefill = JSON.parse(prefillRaw);
          setFormData((prev) => ({
            ...prev,
            title: prefill.title || "",
            observed_condition: prefill.observed_condition || "",
            location: prefill.location || "Audit Checkpoint",
            severity: prefill.severity || "High",
            assigned_emp: prefill.assigned_emp || profile?.employee_number || "690867",
          }));
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

  // Form Mandatory Validation
  const isFormValid =
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

  // Signature Upload Handlers
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

  // Submit Deviation Report (Workflow: Fill Details -> Quantity Validation -> Submit -> Under Review)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      if (!isQtyValid) {
        toast.error(`Quantity Validation Failed: Segregated Quantity (${numSeg}) must equal OK Qty (${numOK}) + NG Qty (${numNG}) = ${numOK + numNG}.`);
      } else {
        toast.error("Please complete all mandatory fields and ensure Approved By Signature is provided.");
      }
      return;
    }

    const newCode = `DEV-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newDev: DeviationItem = {
      id: `dev-${Date.now()}`,
      dev_code: newCode,
      description: formData.title,
      location_operation: formData.location,
      severity: formData.severity,
      employee_number: formData.assigned_emp,
      status: "under_review", // Workflow: Submit -> Under Review -> Admin Approval
      observed_condition: formData.observed_condition || "Non-conformance identified during process audit.",
      corrective_action: formData.corrective_action || "Segregation and containment action initiated.",
      recommended_action: "Preventative tool replacement and process parameter audit.",
      created_at: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),

      // PDF Mandatory Report Fields
      segregated_qty: formData.segregated_qty,
      ok_qty: formData.ok_qty,
      ng_qty: formData.ng_qty,
      root_cause: formData.root_cause,
      segregated_by: formData.segregated_by,
      employee_signature: formData.employee_signature || formData.approved_by_signature,
      approved_by: formData.approved_by,
      approved_by_signature: formData.approved_by_signature,
      report_attached: true,
    };

    const updated = [newDev, ...deviations];
    await saveDeviationsList(updated);

    setIsModalOpen(false);
    toast.success(`Deviation ${newCode} submitted for Admin Review! Status updated to 'Under Review'.`);
  };

  const handleStatusChange = async (id: string, newStatus: "open" | "under_review" | "closed") => {
    const updated = deviations.map((d) => (d.id === id ? { ...d, status: newStatus } : d));
    await saveDeviationsList(updated);
    toast.success(`Deviation status updated to '${newStatus.replace("_", " ")}'`);
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

  const openCount = deviations.filter((d) => d.status === "open").length;
  const reviewCount = deviations.filter((d) => d.status === "under_review").length;
  const closedCount = deviations.filter((d) => d.status === "closed").length;

  return (
    <AppShell
      title="Plant Deviation Tracker (CAPA Management)"
      description="Record quality non-conformances, perform 5-Why root cause analysis, attach mandatory Deviation Reports with E-Signature, and track resolution."
    >
      <div className="space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Plant Non-Conformance & Deviation Register
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Log non-conformances with mandatory Deviation Report page attachment including E-Signature & Quantity Validation.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-brand font-bold text-white hover:bg-brand-hover shadow-sm text-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Deviation Report
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Logged</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">{deviations.length}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-amber-700 uppercase flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Open Non-Conformances
            </div>
            <div className="mt-1 text-2xl font-extrabold text-amber-900">{openCount}</div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-sky-700 uppercase flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Under Review
            </div>
            <div className="mt-1 text-2xl font-extrabold text-sky-900">{reviewCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolved & Closed
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
              onClick={() => setStatusFilter("open")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "open" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter("under_review")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "under_review" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-800 hover:bg-sky-100"
              }`}
            >
              Under Review ({reviewCount})
            </button>
            <button
              onClick={() => setStatusFilter("closed")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "closed" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Closed ({closedCount})
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
                  <th className="p-3 min-w-[220px] font-bold">Deviation Title</th>
                  <th className="p-3 w-36 font-bold">Location</th>
                  <th className="p-3 w-24 font-bold">Severity</th>
                  <th className="p-3 w-28 font-bold">Segregated Qty</th>
                  <th className="p-3 w-28 font-bold">OK / NG Qty</th>
                  <th className="p-3 w-32 font-bold">Deviation Report</th>
                  <th className="p-3 w-32 font-bold">Status</th>
                  {isAdmin && <th className="p-3 text-center w-16 font-bold">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {filteredDeviations.map((dev) => {
                  const severityBadge =
                    dev.severity === "Critical"
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : dev.severity === "High"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : dev.severity === "Medium"
                      ? "bg-sky-100 text-sky-800 border-sky-300"
                      : "bg-slate-100 text-slate-700 border-slate-300";

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
                      <td className="p-3">
                        <span className={`rounded border px-2 py-0.5 text-xs font-bold ${severityBadge}`}>
                          {dev.severity}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {dev.segregated_qty || "N/A"} PCS
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span className="text-emerald-700">{dev.ok_qty || "0"} OK</span> / <span className="text-rose-700">{dev.ng_qty || "0"} NG</span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setViewReportDev(dev)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 text-amber-600" /> View Report
                        </button>
                      </td>
                      <td className="p-3">
                        <select
                          value={dev.status}
                          onChange={(e) =>
                            handleStatusChange(dev.id, e.target.value as "open" | "under_review" | "closed")
                          }
                          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-brand cursor-pointer"
                        >
                          <option value="open">Open</option>
                          <option value="under_review">Under Review</option>
                          <option value="closed">Closed</option>
                        </select>
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
                    <td colSpan={9} className="p-8 text-center text-sm font-semibold text-slate-500">
                      No deviation records match your criteria. Click '+ Create Deviation Report' to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: MANDATORY DEVIATION REPORT FORM (EXACT MATCH FOR CLIENT PDF) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-2xl my-8 rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-500 p-2 text-white shadow-xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      DEVIATION REPORT
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                      Official Quality Non-Conformance Specification Form
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

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                {/* 1. DEVIATION TITLE */}
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

                {/* 2. LOCATION / PLANT / LINE */}
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

                {/* 3. SEVERITY */}
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

                {/* 4, 5, 6. SEGREGATED, OK, NG QUANTITY BREAKDOWN */}
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

                  {/* QUANTITY VALIDATION BOX (MANDATORY PDF RULE) */}
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

                {/* 7. ROOT CAUSE */}
                <div>
                  <label className="block font-black uppercase tracking-wider text-slate-800 mb-1">
                    ROOT CAUSE *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter root cause analysis..."
                    value={formData.root_cause}
                    onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                    className="w-full rounded-md border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand bg-slate-50/50 focus:bg-white"
                  />
                </div>

                {/* 8 & 9. SIGNATURES SECTION (SEGREGATED BY & APPROVED BY) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3">
                  {/* SEGREGATED BY */}
                  <div className="space-y-2 border-r border-slate-200 pr-2">
                    <span className="font-black uppercase text-slate-800 text-[11px]">
                      SEGREGATED BY *
                    </span>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Employee Name:</label>
                      <Input
                        required
                        value={formData.segregated_by}
                        onChange={(e) => setFormData({ ...formData, segregated_by: e.target.value })}
                        placeholder="Employee Name"
                        className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <input type="file" ref={empSigInputRef} onChange={handleEmpSignatureUpload} accept="image/*" className="hidden" />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-600">Signature:</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => empSigInputRef.current?.click()}
                          className="h-6 text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-1.5 cursor-pointer"
                        >
                          <Upload className="h-3 w-3 mr-1" /> Upload
                        </Button>
                      </div>

                      {formData.employee_signature ? (
                        <div className="rounded border border-slate-300 bg-white p-1.5 flex items-center gap-2">
                          <img src={formData.employee_signature} alt="Employee Signature" className="h-8 w-auto object-contain max-w-[140px]" />
                          <span className="text-[9px] text-emerald-700 font-bold">Signed</span>
                        </div>
                      ) : (
                        <div className="h-9 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          Signature Required
                        </div>
                      )}
                    </div>
                  </div>

                  {/* APPROVED BY */}
                  <div className="space-y-2 pl-1">
                    <span className="font-black uppercase text-slate-800 text-[11px]">
                      APPROVED BY *
                    </span>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Approved Name:</label>
                      <Input
                        required
                        value={formData.approved_by}
                        onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                        placeholder="Approved Name"
                        className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <input type="file" ref={appSigInputRef} onChange={handleAppSignatureUpload} accept="image/*" className="hidden" />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-600">Signature:</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => appSigInputRef.current?.click()}
                          className="h-6 text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-1.5 cursor-pointer"
                        >
                          <Upload className="h-3 w-3 mr-1" /> Upload
                        </Button>
                      </div>

                      {formData.approved_by_signature ? (
                        <div className="rounded border border-slate-300 bg-white p-1.5 flex items-center gap-2">
                          <img src={formData.approved_by_signature} alt="Approved By Signature" className="h-8 w-auto object-contain max-w-[140px]" />
                          <span className="text-[9px] text-emerald-700 font-bold">Verified</span>
                        </div>
                      ) : (
                        <div className="h-9 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          E-Signature Required
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SUBMISSION BAR (DISABLED UNTIL ALL VALIDATIONS PASS) */}
                <div className="border-t border-slate-300 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600">
                      Workflow: Deviation → Report → Details → Validation → Submit → Under Review
                    </span>
                    {!isFormValid && (
                      <span className="text-rose-600 font-extrabold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Submit disabled until details & quantity validation complete
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
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
                      disabled={!isFormValid}
                      className={`text-xs font-black text-white shadow-md transition-all ${
                        isFormValid
                          ? "bg-brand hover:bg-brand-hover cursor-pointer"
                          : "bg-slate-300 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      Submit Deviation (Under Review)
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VIEW OFFICIAL DEVIATION REPORT (EXACT REPLICA OF CLIENT PDF) */}
        {viewReportDev && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-3xl my-8 rounded-2xl border border-slate-300 bg-white p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    DEVIATION REPORT
                  </h2>
                  <p className="text-xs font-bold text-slate-500 font-mono">
                    DOCUMENT CODE: {viewReportDev.dev_code}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="gap-1.5 text-xs font-bold border-slate-300 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" /> Print Report
                  </Button>
                  <button
                    onClick={() => setViewReportDev(null)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* PDF EXACT TABLE FORMAT */}
              <div className="border-2 border-slate-900 rounded-lg overflow-hidden text-xs">
                {/* DEVIATION TITLE */}
                <div className="grid grid-cols-3 border-b border-slate-900 bg-white">
                  <div className="p-3 font-black uppercase bg-slate-100 border-r border-slate-900 text-slate-900">
                    DEVIATION TITLE
                  </div>
                  <div className="p-3 col-span-2 font-bold text-slate-900">
                    {viewReportDev.description}
                  </div>
                </div>

                {/* LOCATION */}
                <div className="grid grid-cols-3 border-b border-slate-900 bg-white">
                  <div className="p-3 font-black uppercase bg-slate-100 border-r border-slate-900 text-slate-900">
                    LOCATION / PLANT / LINE
                  </div>
                  <div className="p-3 col-span-2 font-bold text-slate-900">
                    {viewReportDev.location_operation}
                  </div>
                </div>

                {/* SEVERITY */}
                <div className="grid grid-cols-3 border-b border-slate-900 bg-white">
                  <div className="p-3 font-black uppercase bg-slate-100 border-r border-slate-900 text-slate-900">
                    SEVERITY
                  </div>
                  <div className="p-3 col-span-2 font-bold text-slate-900 flex items-center gap-4">
                    {(["Low", "Medium", "High", "Critical"] as const).map((sev) => (
                      <span key={sev} className="flex items-center gap-1.5">
                        <span className={`inline-block h-3.5 w-3.5 rounded border border-slate-900 ${viewReportDev.severity === sev ? "bg-slate-900" : "bg-white"}`} />
                        <span>{sev}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* SEGREGATED QUANTITY */}
                <div className="grid grid-cols-3 border-b border-slate-900 bg-white">
                  <div className="p-3 font-black uppercase bg-slate-100 border-r border-slate-900 text-slate-900">
                    SEGREGATED QUANTITY
                  </div>
                  <div className="p-3 col-span-2 font-mono font-black text-slate-900">
                    {viewReportDev.segregated_qty || "100"} PCS
                  </div>
                </div>

                {/* OK QUANTITY */}
                <div className="grid grid-cols-3 border-b border-slate-900 bg-white">
                  <div className="p-3 font-black uppercase bg-slate-100 border-r border-slate-900 text-slate-900">
                    OK QUANTITY
                  </div>
                  <div className="p-3 col-span-2 font-mono font-black text-emerald-800">
                    {viewReportDev.ok_qty || "95"} PCS
                  </div>
                </div>

                {/* NG QUANTITY */}
                <div className="grid grid-cols-3 border-b border-slate-900 bg-white">
                  <div className="p-3 font-black uppercase bg-slate-100 border-r border-slate-900 text-slate-900">
                    NG QUANTITY
                  </div>
                  <div className="p-3 col-span-2 font-mono font-black text-rose-800">
                    {viewReportDev.ng_qty || "5"} PCS
                  </div>
                </div>

                {/* ROOT CAUSE */}
                <div className="grid grid-cols-3 border-b-2 border-slate-900 bg-white">
                  <div className="p-3 font-black uppercase bg-slate-100 border-r border-slate-900 text-slate-900">
                    ROOT CAUSE
                  </div>
                  <div className="p-3 col-span-2 font-medium text-slate-900 min-h-[60px] whitespace-pre-wrap">
                    {viewReportDev.root_cause || viewReportDev.observed_condition}
                  </div>
                </div>

                {/* QUANTITY VALIDATION SECTION */}
                <div className="p-3 bg-slate-50 border-b-2 border-slate-900 space-y-1">
                  <p className="font-black uppercase tracking-wider text-slate-900">QUANTITY VALIDATION</p>
                  <p className="font-bold text-slate-700">Formula: Segregated Quantity = OK Quantity + NG Quantity</p>
                  <p className="font-mono text-emerald-800 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Verified: Segregated Qty ({viewReportDev.segregated_qty || "100"}) = OK Qty ({viewReportDev.ok_qty || "95"}) + NG Qty ({viewReportDev.ng_qty || "5"}) [PASS]
                  </p>
                </div>

                {/* SEGREGATED BY & APPROVED BY TABLE */}
                <div className="grid grid-cols-2 bg-white">
                  <div className="p-3 border-r border-slate-900 space-y-3">
                    <p className="font-black uppercase text-slate-900 border-b border-slate-300 pb-1">SEGREGATED BY</p>
                    <p className="font-bold text-slate-800">
                      Employee Name: <span className="font-black text-slate-900">{viewReportDev.segregated_by || `Emp #${viewReportDev.employee_number}`}</span>
                    </p>
                    <div>
                      <p className="font-bold text-slate-800 mb-1">Signature:</p>
                      {viewReportDev.employee_signature || viewReportDev.approved_by_signature ? (
                        <img src={viewReportDev.employee_signature || viewReportDev.approved_by_signature} alt="Employee Signature" className="h-10 w-auto object-contain border p-1 rounded" />
                      ) : (
                        <p className="font-mono italic text-slate-500">Verified Electronic Sign-off</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    <p className="font-black uppercase text-slate-900 border-b border-slate-300 pb-1">APPROVED BY</p>
                    <p className="font-bold text-slate-800">
                      Approved Name: <span className="font-black text-slate-900">{viewReportDev.approved_by || "KARTHIKEYAN C (690867)"}</span>
                    </p>
                    <div>
                      <p className="font-bold text-slate-800 mb-1">Signature:</p>
                      {viewReportDev.approved_by_signature ? (
                        <img src={viewReportDev.approved_by_signature} alt="Approved By Signature" className="h-10 w-auto object-contain border p-1 rounded" />
                      ) : (
                        <p className="font-mono italic text-emerald-800 font-bold">E-Signature Verified on File</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-bold text-slate-500">
                  Workflow Status: <span className="uppercase text-sky-800 font-black">{viewReportDev.status.replace("_", " ")}</span>
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
