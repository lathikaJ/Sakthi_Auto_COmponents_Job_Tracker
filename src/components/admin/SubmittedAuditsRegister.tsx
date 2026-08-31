import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";
import {
  FileCheck2,
  Search,
  RefreshCcw,
  Download,
  Package,
  UserCheck,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  getSubmittedAudits,
  type SubmittedAuditItem,
} from "@/lib/submittedAudits";
import { StatusBadge } from "@/components/app/StatusBadge";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function SubmittedAuditsRegister() {
  const [submittedList, setSubmittedList] = useState<SubmittedAuditItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleExport = () => {
    if (submittedList.length === 0) {
      toast.error("No submitted audits available to export.");
      return;
    }
    const dataToExport = submittedList.map((item) => ({
      "Audit Code": item.audit_code,
      "Part No": item.part_no,
      "Part Name": item.part_name,
      "Employee Name": item.employee_name,
      "Employee ID": item.employee_number,
      Department: item.department,
      "Submitted Date & Time": item.formatted_submitted_date,
      Status: item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Submitted Audits Register"
    );
    XLSX.writeFile(
      workbook,
      `Sakthi_Submitted_Audits_Register_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("Submitted Audits Register exported to Excel!");
  };

  const filtered = submittedList.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      item.part_no.toLowerCase().includes(term) ||
      item.part_name.toLowerCase().includes(term) ||
      item.employee_name.toLowerCase().includes(term) ||
      item.employee_number.toLowerCase().includes(term) ||
      item.audit_code.toLowerCase().includes(term) ||
      item.department.toLowerCase().includes(term)
    );
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Submitted Audits — Part & Employee Register
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 flex items-center gap-1 border border-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Live Admin Feed
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Real-time track of Part No, Part Name, Employee Name, and Submitted Date for every completed audit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAudits}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCcw className="h-3.5 w-3.5 text-slate-500" /> Refresh
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-emerald-700" /> Export Excel
          </button>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Audits Submitted
            </span>
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 tabular-nums">
            {submittedList.length}
          </p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Unique Parts Inspected
            </span>
            <Package className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-900 tabular-nums">
            {new Set(submittedList.map((s) => s.part_no)).size} Parts
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Inspectors
            </span>
            <UserCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-900 tabular-nums">
            {new Set(submittedList.map((s) => s.employee_number)).size} Employees
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by Part No, Part Name, Employee Name, or Audit Code…"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Table Displaying Part No, Part Name, Name of Employee, Submitted Date */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                <th className="p-3 font-bold w-28">Part No</th>
                <th className="p-3 font-bold min-w-[200px]">Part Name</th>
                <th className="p-3 font-bold min-w-[180px]">Name of Employee</th>
                <th className="p-3 font-bold w-44">Submitted Date & Time</th>
                <th className="p-3 font-bold w-28">Audit Code</th>
                <th className="p-3 font-bold w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {filtered.map((item) => {
                const subDate = new Date(item.submitted_date);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Part No */}
                    <td className="p-3 font-mono font-bold text-sky-700">
                      <span className="rounded bg-sky-50 px-2 py-1 border border-sky-200">
                        {item.part_no}
                      </span>
                    </td>

                    {/* Part Name */}
                    <td className="p-3 font-bold text-slate-900">
                      {item.part_name}
                    </td>

                    {/* Name of Employee */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        {item.employee_name}
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-600">
                        Emp #{item.employee_number}
                      </span>
                    </td>

                    {/* Submitted Date */}
                    <td className="p-3 font-mono text-slate-700">
                      <div className="font-bold text-slate-900">
                        {item.formatted_submitted_date}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(subDate, { addSuffix: true })}
                      </span>
                    </td>

                    {/* Audit Code */}
                    <td className="p-3 font-mono font-bold text-brand">
                      <Link
                        to="/audit/$auditId"
                        params={{ auditId: item.audit_code.toLowerCase().replace(/[^a-z0-9-]/g, "-") }}
                        className="hover:underline hover:text-orange-600 flex items-center gap-1"
                      >
                        {item.audit_code}
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-medium text-slate-500">
                    No submitted audit records matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
