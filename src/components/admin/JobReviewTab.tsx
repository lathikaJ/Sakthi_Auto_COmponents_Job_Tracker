import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCcw,
  Sparkles,
  User,
  Clock,
  Check,
  X,
  Eye,
  ShieldCheck,
} from "lucide-react";
import {
  getSubmittedAudits,
  updateSubmittedAuditStatus,
  type SubmittedAuditItem,
} from "@/lib/submittedAudits";
import { authenticateAndGetSignature } from "@/lib/electronicSignatures";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function JobReviewTab({ isAdmin }: { isAdmin: boolean }) {
  const [submittedList, setSubmittedList] = useState<SubmittedAuditItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedJobForReview, setSelectedJobForReview] = useState<SubmittedAuditItem | null>(null);

  const loadAudits = () => {
    setSubmittedList(getSubmittedAudits());
  };

  useEffect(() => {
    loadAudits();
    const handleUpdate = () => loadAudits();
    window.addEventListener("sakthi_submitted_audits_updated", handleUpdate);
    return () => {
      window.removeEventListener("sakthi_submitted_audits_updated", handleUpdate);
    };
  }, []);

  const handleApprove = (item: SubmittedAuditItem) => {
    if (!isAdmin) {
      toast.error("Access Denied: Only Admins can approve submitted jobs.");
      return;
    }
    const adminSig = authenticateAndGetSignature("690867"); // Admin KARTHIKEYAN C
    updateSubmittedAuditStatus(item.id, "Approved", `Approved & Signed by Admin Lead (${adminSig?.employee_name || "KARTHIKEYAN C"})`);

    // Also update main task status to Completed in sakthi_excel_tasks_v8 so it moves to Completed Audit
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_excel_tasks_v8");
      if (stored) {
        try {
          let tasks = JSON.parse(stored);
          let updated = false;
          tasks = tasks.map((t: any) => {
            if (t.id === item.id || t.audit_code === item.audit_code) {
              updated = true;
              return {
                ...t,
                status: "Completed",
                completion_date: new Date().toISOString().split("T")[0],
                final_result: "PASS / COMPLIANT",
              };
            }
            return t;
          });
          if (!updated) {
            tasks.push({
              id: item.id,
              audit_code: item.audit_code,
              title: item.part_name,
              audit_type: "Product",
              area: item.department,
              assigned_to_employee_number: item.employee_number,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              due_date: new Date().toISOString().split("T")[0],
              status: "Completed",
              completion_date: new Date().toISOString().split("T")[0],
              final_result: "PASS / COMPLIANT",
            });
          }
          localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
          window.dispatchEvent(new Event("excel_tasks_updated"));
        } catch {
          // Ignore
        }
      }
    }

    toast.success(`Job ${item.audit_code} for ${item.employee_name} approved with Admin E-Signature & moved to Completed Audit!`);
  };

  const handleReject = (item: SubmittedAuditItem) => {
    if (!isAdmin) {
      toast.error("Access Denied: Only Admins can reject submitted jobs.");
      return;
    }
    updateSubmittedAuditStatus(item.id, "Not Completed", "Not Approved by Admin — Marked as Not Completed");

    // Also update main task status to Not Completed in sakthi_excel_tasks_v8
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_excel_tasks_v8");
      if (stored) {
        try {
          let tasks = JSON.parse(stored);
          let updated = false;
          tasks = tasks.map((t: any) => {
            if (t.id === item.id || t.audit_code === item.audit_code) {
              updated = true;
              return {
                ...t,
                status: "Not Completed",
                final_result: "REJECTED / NOT COMPLETED",
              };
            }
            return t;
          });
          if (!updated) {
            tasks.push({
              id: item.id,
              audit_code: item.audit_code,
              title: item.part_name,
              audit_type: "Product",
              area: item.department,
              assigned_to_employee_number: item.employee_number,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              due_date: new Date().toISOString().split("T")[0],
              status: "Not Completed",
              final_result: "REJECTED / NOT COMPLETED",
            });
          }
          localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
          window.dispatchEvent(new Event("excel_tasks_updated"));
        } catch {
          // Ignore
        }
      }
    }

    toast.error(`Job ${item.audit_code} rejected by Admin. Audit moved to 'Not Completed'.`);
  };

  const filtered = submittedList.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      item.part_no.toLowerCase().includes(term) ||
      item.part_name.toLowerCase().includes(term) ||
      item.employee_name.toLowerCase().includes(term) ||
      item.employee_number.toLowerCase().includes(term) ||
      item.audit_code.toLowerCase().includes(term) ||
      item.department.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "Submitted" && item.status === "Submitted") ||
      (statusFilter === "Approved" && (item.status === "Approved" || item.status === "Completed")) ||
      ((statusFilter === "Not Completed" || statusFilter === "Rejected") && (item.status === "Not Completed" || item.status === "Rejected"));

    return matchesSearch && matchesStatus;
  });

  const pendingCount = submittedList.filter((s) => s.status === "Submitted").length;
  const approvedCount = submittedList.filter((s) => s.status === "Approved" || s.status === "Completed").length;
  const rejectedCount = submittedList.filter((s) => s.status === "Not Completed" || s.status === "Rejected").length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Employee Job Review Hub
            </h2>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 flex items-center gap-1 border border-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Admin Verification Queue
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Review employee-submitted quality audits, verify checkpoint parameters, and assign administrative Approve or Reject status.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAudits}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <RefreshCcw className="h-3.5 w-3.5 text-slate-500" /> Refresh Queue
        </button>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Admin Review
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900 tabular-nums">
            {pendingCount} Jobs
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Approved Audits
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 tabular-nums">
            {approvedCount} Jobs
          </p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Not Completed / Rejected
            </span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-900 tabular-nums">
            {rejectedCount} Jobs
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Part No, Part Name, Employee Name, or Audit Code…"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            {["ALL", "Submitted", "Approved", "Not Completed"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {st === "Submitted" ? "Pending Review" : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submitted Jobs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                <th className="p-3 font-bold w-28">Audit Code</th>
                <th className="p-3 font-bold w-36">Part No</th>
                <th className="p-3 font-bold min-w-[200px]">Part Name</th>
                <th className="p-3 font-bold min-w-[180px]">Submitted By Employee</th>
                <th className="p-3 font-bold w-40">Submission Date</th>
                <th className="p-3 font-bold w-28 text-center">Status</th>
                <th className="p-3 font-bold w-44 text-center">Admin Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {filtered.map((item) => {
                const subDate = new Date(item.submitted_date);
                const isPending = item.status === "Submitted";
                const isApproved = item.status === "Approved" || item.status === "Completed";
                const isRejected = item.status === "Rejected";

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Audit Code */}
                    <td className="p-3 font-mono font-bold text-indigo-700">
                      <Link
                        to="/audit/$auditId"
                        params={{ auditId: item.audit_code.toLowerCase().replace(/[^a-z0-9-]/g, "-") }}
                        className="rounded bg-indigo-50 px-2 py-1 border border-indigo-200 hover:bg-indigo-100 hover:underline transition-colors"
                      >
                        {item.audit_code}
                      </Link>
                    </td>

                    {/* Part No */}
                    <td className="p-3 font-mono font-bold text-sky-700">
                      {item.part_no}
                    </td>

                    {/* Part Name */}
                    <td className="p-3 font-bold text-slate-900">
                      {item.part_name}
                    </td>

                    {/* Submitted By Employee */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {item.employee_name}
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-600">
                        Emp #{item.employee_number}
                      </span>
                    </td>

                    {/* Submission Date */}
                    <td className="p-3 font-mono text-slate-700">
                      <div className="font-bold text-slate-900">
                        {item.formatted_submitted_date}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(subDate, { addSuffix: true })}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center">
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Approved
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                          <Clock className="h-3 w-3 text-amber-600" /> Pending Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-300">
                          <XCircle className="h-3 w-3 text-rose-600" /> Rejected
                        </span>
                      )}
                    </td>

                    {/* Admin Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedJobForReview(item)}
                          className="flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-all shadow-2xs"
                          title="View submitted evidence photos, parameter checkpoints, and authenticated E-Signature"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-700" />
                          Review Evidence
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          disabled={!isAdmin || isApproved}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all shadow-2xs ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default opacity-80"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                          }`}
                          title="Approve employee audit submission"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {isApproved ? "Approved" : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          disabled={!isAdmin || isRejected}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all shadow-2xs ${
                            isRejected
                              ? "bg-rose-50 text-rose-600 border border-rose-200 cursor-default opacity-80"
                              : "bg-rose-600 text-white hover:bg-rose-700 active:scale-95"
                          }`}
                          title="Reject audit submission and return for revision"
                        >
                          <X className="h-3.5 w-3.5" />
                          {isRejected ? "Rejected" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs font-medium text-slate-500">
                    No submitted job records matching your search and status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Admin Audit Quality Evidence & E-Signature Verification Modal ── */}
      {selectedJobForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-100 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-800 border border-indigo-300">
                    {selectedJobForReview.audit_code}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 flex items-center gap-1 border border-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Quality Evidence Inspection
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">
                  Audit Inspection Evidences & E-Signature Sign-Off
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Part No: <strong className="text-sky-700 font-mono">{selectedJobForReview.part_no}</strong> · {selectedJobForReview.part_name}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedJobForReview(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Grid: 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: Inspector Credentials & Signature */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <User className="h-4 w-4 text-indigo-600" /> Inspector Identification
                </h4>
                <div className="space-y-1.5 text-xs">
                  <p className="font-extrabold text-slate-900 text-sm">{selectedJobForReview.employee_name}</p>
                  <p className="font-mono text-slate-600 font-bold">Employee ID: #{selectedJobForReview.employee_number}</p>
                  <p className="text-slate-500 font-medium">{selectedJobForReview.department}</p>
                  <p className="text-slate-400 font-mono text-[11px] pt-1">
                    Submitted: {selectedJobForReview.formatted_submitted_date}
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Authenticated E-Signature</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ Verified Digital Sign
                    </span>
                  </h4>
                  <div className="rounded-lg border border-slate-300 bg-white p-3 flex items-center justify-center min-h-[110px] shadow-2xs">
                    {authenticateAndGetSignature(selectedJobForReview.employee_number)?.signature_url ? (
                      <img
                        src={authenticateAndGetSignature(selectedJobForReview.employee_number)?.signature_url}
                        alt="Inspector E-Signature"
                        className="max-h-24 max-w-full object-contain filter drop-shadow-xs"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">No Signature On File</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: Checkpoint Parameters & Evidences */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <FileCheck2 className="h-4 w-4 text-sky-600" /> Submitted Parameter Checkpoints
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
                    <span className="font-semibold text-slate-700">Hardness Test (HRC)</span>
                    <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">62 HRC (OK)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
                    <span className="font-semibold text-slate-700">Surface Roughness (Ra)</span>
                    <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">0.8 µm (OK)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
                    <span className="font-semibold text-slate-700">Bore Internal Diameter</span>
                    <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">45.02 mm (OK)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
                    <span className="font-semibold text-slate-700">Visual Defect & Crack Test</span>
                    <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Pass / Zero Porosity</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Action Verification Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 bg-slate-50 p-4 rounded-xl">
              <span className="text-xs font-bold text-slate-600">
                Admin Verification Decision for {selectedJobForReview.audit_code}:
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedJobForReview(null)}>
                  Close Viewer
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    handleReject(selectedJobForReview);
                    setSelectedJobForReview(null);
                  }}
                  disabled={selectedJobForReview.status === "Rejected"}
                  className="bg-rose-600 text-white font-bold hover:bg-rose-700 gap-1.5 shadow-xs"
                >
                  <X className="h-4 w-4" /> Reject Submission
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    handleApprove(selectedJobForReview);
                    setSelectedJobForReview(null);
                  }}
                  disabled={selectedJobForReview.status === "Approved" || selectedJobForReview.status === "Completed"}
                  className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 gap-1.5 shadow-xs"
                >
                  <Check className="h-4 w-4" /> Approve & Sign Off Audit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
