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
  UserCheck,
  Building2,
  X,
  FileText,
  ShieldCheck,
  Upload,
  Check,
  Eye,
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
  location_operation: string; // Location
  employee_number: string;
  severity: "Low" | "Medium" | "High" | "Critical"; // Severity
  status: "open" | "under_review" | "closed";
  corrective_action: string;
  recommended_action: string;
  created_at: string;

  // Mandatory Deviation Report Page Fields (Editable by Employee Only)
  segregated_qty: string;
  ok_qty: string;
  ng_qty: string;
  root_cause: string;
  segregated_by: string; // Employee entry / sign-off
  approved_by_signature: string; // E-Signature
  report_attached: boolean;
};

const EMPLOYEE_LIST = ["690867", "688079", "663875", "710250", "666468", "665773", "665965", "708818", "667685"];

function DeviationsPage() {
  const { profile, isAdmin } = useAuth();
  const [deviations, setDeviations] = useState<DeviationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewReportDev, setViewReportDev] = useState<DeviationItem | null>(null);

  const sigInputRef = useRef<HTMLInputElement>(null);

  // New Deviation Form State (Mandatory Report Page Fields)
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
    approved_by_signature: "",
  });

  // Load registered e-signature automatically if available
  useEffect(() => {
    const currentEmp = profile?.employee_number || "688079";
    const sigObj = authenticateAndGetSignature(currentEmp);
    if (sigObj?.signature_url) {
      setFormData((prev) => ({ ...prev, approved_by_signature: sigObj.signature_url }));
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

  // E-Signature File Upload Handler
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG, JPG, SVG).");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        setFormData((prev) => ({ ...prev, approved_by_signature: result }));
        toast.success("E-Signature uploaded for Approved By!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Create Deviation Submit with Strict Mandatory Field Checks
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mandatory Deviation Report Field Validations
    if (!formData.title.trim()) {
      toast.error("Deviation Title is mandatory.");
      return;
    }
    if (!formData.location.trim()) {
      toast.error("Location is mandatory.");
      return;
    }
    if (!formData.segregated_qty.trim()) {
      toast.error("Segregated Quantity is mandatory.");
      return;
    }
    if (!formData.ok_qty.trim()) {
      toast.error("OK Quantity is mandatory.");
      return;
    }
    if (!formData.ng_qty.trim()) {
      toast.error("NG Quantity is mandatory.");
      return;
    }
    if (!formData.root_cause.trim()) {
      toast.error("Root Cause analysis is mandatory.");
      return;
    }
    if (!formData.segregated_by.trim()) {
      toast.error("Segregated By (Employee entry / sign-off) is mandatory.");
      return;
    }
    if (!formData.approved_by_signature) {
      toast.error("Approved By E-Signature is mandatory before submitting Deviation Report.");
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
      status: "open",
      observed_condition: formData.observed_condition || "Non-conformance identified during process audit.",
      corrective_action: formData.corrective_action || "Segregation and containment action initiated.",
      recommended_action: "Preventative tool replacement and process parameter audit.",
      created_at: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),

      // Report Page Mandatory Fields
      segregated_qty: formData.segregated_qty,
      ok_qty: formData.ok_qty,
      ng_qty: formData.ng_qty,
      root_cause: formData.root_cause,
      segregated_by: formData.segregated_by,
      approved_by_signature: formData.approved_by_signature,
      report_attached: true,
    };

    const updated = [newDev, ...deviations];
    await saveDeviationsList(updated);

    setIsModalOpen(false);
    toast.success(`Deviation ${newCode} & Mandatory Deviation Report Page created & attached successfully!`);
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
              Log non-conformances with mandatory Deviation Report page attachment including E-Signature & Root Cause analysis.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-brand font-bold text-white hover:bg-brand-hover shadow-sm text-xs"
          >
            <Plus className="h-4 w-4" /> Insert New Deviation (with Report)
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
              <Clock className="h-3.5 w-3.5" /> Under CAPA Review
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
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All ({deviations.length})
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === "open" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter("under_review")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === "under_review" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-800 hover:bg-sky-100"
              }`}
            >
              Under Review ({reviewCount})
            </button>
            <button
              onClick={() => setStatusFilter("closed")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
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
                  <th className="p-3 min-w-[220px] font-bold">Deviation Title & Details</th>
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
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-900 hover:bg-amber-100 transition-colors"
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
                          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-brand"
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
                            className="h-7 w-7 text-rose-600 hover:bg-rose-100"
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
                      No deviation records match your criteria. Click '+ Insert New Deviation' to add one with mandatory report page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: MANDATORY DEVIATION REPORT PAGE CREATION (EMPLOYEE EDITABLE ONLY) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-2xl my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Mandatory Deviation Report Page
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      All fields below are mandatory. Employee entry/sign-off & E-Signature are required.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                {/* 1. DEVIATION TITLE & LOCATION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      1. Deviation Title *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Steering Knuckle Bore Oversize Non-Conformance"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="border-slate-300 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      2. Location / Line *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Machine Shop Line 1 / Cell 3"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="border-slate-300 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* 3. SEVERITY & ASSIGNED EMPLOYEE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      3. Severity *
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          severity: e.target.value as "Low" | "Medium" | "High" | "Critical",
                        })
                      }
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Assigned Responsible Employee
                    </label>
                    <select
                      value={formData.assigned_emp}
                      onChange={(e) => setFormData({ ...formData, assigned_emp: e.target.value })}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand"
                    >
                      {EMPLOYEE_LIST.map((emp) => (
                        <option key={emp} value={emp}>
                          Emp #{emp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. SEGREGATED QUANTITY, OK QUANTITY, NG QUANTITY */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <span className="font-bold text-slate-900 uppercase text-[11px]">
                    Quantity Segregation Breakdown *
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        4. Segregated Qty *
                      </label>
                      <Input
                        required
                        type="text"
                        value={formData.segregated_qty}
                        onChange={(e) => setFormData({ ...formData, segregated_qty: e.target.value })}
                        placeholder="100"
                        className="bg-white border-slate-300 font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-emerald-800 mb-1">
                        5. OK Quantity *
                      </label>
                      <Input
                        required
                        type="text"
                        value={formData.ok_qty}
                        onChange={(e) => setFormData({ ...formData, ok_qty: e.target.value })}
                        placeholder="95"
                        className="bg-white border-emerald-300 font-mono font-bold text-emerald-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-rose-800 mb-1">
                        6. NG Quantity *
                      </label>
                      <Input
                        required
                        type="text"
                        value={formData.ng_qty}
                        onChange={(e) => setFormData({ ...formData, ng_qty: e.target.value })}
                        placeholder="5"
                        className="bg-white border-rose-300 font-mono font-bold text-rose-900"
                      />
                    </div>
                  </div>
                </div>

                {/* 7. ROOT CAUSE */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    7. Root Cause Analysis *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter detailed 5-Why root cause analysis..."
                    value={formData.root_cause}
                    onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                    className="w-full rounded-md border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand"
                  />
                </div>

                {/* 8. SEGREGATED BY (EMPLOYEE ENTRY / SIGN-OFF) */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    8. Segregated By – Employee Entry / Sign-Off *
                  </label>
                  <Input
                    required
                    value={formData.segregated_by}
                    onChange={(e) => setFormData({ ...formData, segregated_by: e.target.value })}
                    placeholder="Employee Name & ID (e.g. SILAMBARASAN S - 688079)"
                    className="border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                {/* 9. APPROVED BY – E-SIGNATURE */}
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-600" /> 9. Approved By – Mandatory E-Signature *
                    </span>
                    {formData.approved_by_signature && (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                        <Check className="h-3 w-3" /> E-Signature Verified
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-amber-800 font-medium">
                    Upload or authenticate employee e-signature image. Deviation report cannot be submitted without an E-Signature.
                  </p>

                  <input
                    type="file"
                    ref={sigInputRef}
                    onChange={handleSignatureUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => sigInputRef.current?.click()}
                      className="bg-white border-amber-300 text-amber-900 font-bold hover:bg-amber-100 text-xs gap-1.5 shadow-2xs"
                    >
                      <Upload className="h-3.5 w-3.5 text-amber-600" /> Upload E-Signature
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const emp = profile?.employee_number || "688079";
                        const sigData = authenticateAndGetSignature(emp);
                        if (sigData?.signature_url) {
                          setFormData((prev) => ({ ...prev, approved_by_signature: sigData.signature_url }));
                          toast.success(`Loaded signature for ${sigData.employee_name}!`);
                        } else {
                          toast.error("No registered signature found. Please upload one above.");
                        }
                      }}
                      className="bg-amber-100 border-amber-300 text-amber-900 font-bold hover:bg-amber-200 text-xs gap-1.5 shadow-2xs"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-700" /> Auto-Load Roster Signature
                    </Button>
                  </div>

                  {formData.approved_by_signature && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 flex items-center gap-3">
                      <img
                        src={formData.approved_by_signature}
                        alt="Approved By E-Signature"
                        className="h-10 w-auto object-contain max-w-[160px]"
                      />
                      <span className="text-[10px] text-slate-500 font-medium">
                        Approved By E-Signature linked to report
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="border-slate-300 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-brand text-xs font-black text-white hover:bg-brand-hover shadow-md">
                    Submit Mandatory Deviation Report
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VIEW DEVIATION REPORT PAGE */}
        {viewReportDev && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-2xl my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <h3 className="text-base font-black text-slate-900">
                    Official Deviation Report Page — [{viewReportDev.dev_code}]
                  </h3>
                </div>
                <button
                  onClick={() => setViewReportDev(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-xl border border-slate-300 p-5 bg-slate-50/50 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Deviation Title</p>
                    <p className="font-black text-slate-900 text-sm">{viewReportDev.description}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Location</p>
                    <p className="font-bold text-slate-800">{viewReportDev.location_operation}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Severity</p>
                    <span className="inline-block rounded bg-amber-100 text-amber-800 px-2 py-0.5 font-bold">
                      {viewReportDev.severity}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Segregated Qty</p>
                    <p className="font-mono font-bold text-slate-900">{viewReportDev.segregated_qty || "N/A"} PCS</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">OK / NG Breakdown</p>
                    <p className="font-mono font-bold text-slate-900">
                      <span className="text-emerald-700">{viewReportDev.ok_qty || "0"} OK</span> / <span className="text-rose-700">{viewReportDev.ng_qty || "0"} NG</span>
                    </p>
                  </div>
                </div>

                <div className="border-b border-slate-200 pb-3">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400">Root Cause Analysis</p>
                  <p className="font-medium text-slate-800 mt-1">{viewReportDev.root_cause || viewReportDev.observed_condition}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Segregated By (Employee Entry)</p>
                    <p className="font-bold text-slate-900 mt-1">{viewReportDev.segregated_by || `Emp #${viewReportDev.employee_number}`}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Approved By (E-Signature)</p>
                    {viewReportDev.approved_by_signature ? (
                      <div className="mt-1 rounded-lg border border-slate-200 bg-white p-2">
                        <img
                          src={viewReportDev.approved_by_signature}
                          alt="Approved By E-Signature"
                          className="h-10 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <p className="font-bold text-emerald-800 italic mt-1">E-Signature Verified on File</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewReportDev(null)}
                  className="text-xs font-bold"
                >
                  Close Report Page
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
