import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Clock,
  LogIn,
  LogOut,
  Search,
  RefreshCcw,
  Download,
  Trash2,
  Users,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from "lucide-react";
import {
  getActivityLogs,
  clearActivityLogs,
  type ActivityLogItem,
} from "@/lib/activityLogs";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function EmployeeActivityLogs() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "LOGIN" | "LOGOUT">("ALL");

  const loadLogs = () => {
    setLogs(getActivityLogs());
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener("sakthi_activity_logs_updated", handleUpdate);
    return () => {
      window.removeEventListener("sakthi_activity_logs_updated", handleUpdate);
    };
  }, []);

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all employee activity logs?")) {
      clearActivityLogs();
      toast.success("Employee activity logs cleared.");
    }
  };

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error("No logs available to export.");
      return;
    }
    const dataToExport = logs.map((log) => ({
      "Log ID": log.id,
      "Date & Time": format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      "Employee Number": log.employee_number,
      "Employee Name": log.full_name,
      Department: log.department,
      Designation: log.designation,
      Role: log.role.toUpperCase(),
      "Event Type": log.event_type,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Access Logs");
    XLSX.writeFile(
      workbook,
      `Sakthi_Employee_Activity_Logs_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("Employee activity log exported to Excel!");
  };

  // Filter logs based on search and event type
  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      filterType === "ALL" ? true : log.event_type === filterType;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      log.employee_number.toLowerCase().includes(term) ||
      log.full_name.toLowerCase().includes(term) ||
      log.department.toLowerCase().includes(term) ||
      log.designation.toLowerCase().includes(term);

    return matchesFilter && matchesSearch;
  });

  const totalLogins = logs.filter((l) => l.event_type === "LOGIN").length;
  const totalLogouts = logs.filter((l) => l.event_type === "LOGOUT").length;

  // Calculate unique employees with active sessions (latest event is LOGIN)
  const employeeLatestEventMap = new Map<string, ActivityLogItem>();
  logs.forEach((log) => {
    if (!employeeLatestEventMap.has(log.employee_number)) {
      employeeLatestEventMap.set(log.employee_number, log);
    }
  });

  const activeSessionsCount = Array.from(
    employeeLatestEventMap.values()
  ).filter((l) => l.event_type === "LOGIN").length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand/10 p-2 text-brand">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Employee Login & Logout Activity Log
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 flex items-center gap-1 border border-emerald-300">
              <Activity className="h-3 w-3 animate-pulse text-emerald-600" />
              Live Audit Trail
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Real-time timestamp records of employee and admin portal logins and logouts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLogs}
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

          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-xs"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Clear Logs
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Access Events
            </span>
            <Users className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
            {logs.length}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Logins Recorded
            </span>
            <LogIn className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 tabular-nums">
            {totalLogins}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Logouts Recorded
            </span>
            <LogOut className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900 tabular-nums">
            {totalLogouts}
          </p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Employee Sessions
            </span>
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-900 tabular-nums">
            {activeSessionsCount}
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
            placeholder="Search by Employee ID, name, or department…"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`rounded px-3 py-1 text-xs font-bold transition-all ${
              filterType === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Events ({logs.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType("LOGIN")}
            className={`rounded px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === "LOGIN"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <LogIn className="h-3 w-3" /> Logins ({totalLogins})
          </button>

          <button
            type="button"
            onClick={() => setFilterType("LOGOUT")}
            className={`rounded px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === "LOGOUT"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-amber-700 hover:bg-amber-50"
            }`}
          >
            <LogOut className="h-3 w-3" /> Logouts ({totalLogouts})
          </button>
        </div>
      </div>

      {/* Access Logs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                <th className="p-3 font-bold w-44">Date & Time</th>
                <th className="p-3 font-bold w-28">Emp ID</th>
                <th className="p-3 font-bold min-w-[180px]">Employee Name</th>
                <th className="p-3 font-bold w-36">Department</th>
                <th className="p-3 font-bold w-24">Role</th>
                <th className="p-3 font-bold w-32">Access Event</th>
                <th className="p-3 font-bold w-32">Session Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {filteredLogs.map((log) => {
                const logDate = new Date(log.timestamp);
                const isLogin = log.event_type === "LOGIN";

                // Check if this employee's latest event is this login
                const latestForEmp = employeeLatestEventMap.get(
                  log.employee_number
                );
                const isActiveSession =
                  isLogin && latestForEmp?.id === log.id;

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="p-3 font-mono text-slate-700">
                      <div className="font-bold text-slate-900">
                        {format(logDate, "dd MMM yyyy, hh:mm:ss a")}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(logDate, { addSuffix: true })}
                      </span>
                    </td>

                    {/* Emp ID */}
                    <td className="p-3 font-mono font-bold text-brand">
                      Emp #{log.employee_number}
                    </td>

                    {/* Employee Name */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        {log.full_name}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {log.designation}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="p-3 font-semibold text-slate-700">
                      {log.department}
                    </td>

                    {/* Role */}
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          log.role === "admin"
                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {log.role === "admin" && (
                          <ShieldCheck className="h-3 w-3 text-purple-600" />
                        )}
                        {log.role === "admin" ? "Admin" : "Employee"}
                      </span>
                    </td>

                    {/* Access Event */}
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                          isLogin
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {isLogin ? (
                          <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        {log.event_type}
                      </span>
                    </td>

                    {/* Session Status */}
                    <td className="p-3">
                      {isActiveSession ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active Session
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Closed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-xs font-medium text-slate-500"
                  >
                    No employee activity logs found matching your criteria.
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
