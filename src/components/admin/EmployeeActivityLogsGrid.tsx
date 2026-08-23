import { useState, useEffect } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Search,
  Filter,
  RefreshCcw,
  UserCheck,
  Shield,
  Sparkles,
  User,
  Calendar,
} from "lucide-react";
import {
  getActivityLogs,
  type ActivityLogItem,
} from "@/lib/activityLogs";
import { formatDistanceToNow, format } from "date-fns";

export function EmployeeActivityLogsGrid() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState<"ALL" | "LOGIN" | "LOGOUT">("ALL");

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

  const filtered = logs.filter((log) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      log.full_name.toLowerCase().includes(term) ||
      log.employee_number.toLowerCase().includes(term) ||
      log.department.toLowerCase().includes(term) ||
      log.designation.toLowerCase().includes(term);

    const matchesEvent = eventFilter === "ALL" || log.event_type === eventFilter;

    return matchesSearch && matchesEvent;
  });

  const totalLogins = logs.filter((l) => l.event_type === "LOGIN").length;
  const totalLogouts = logs.filter((l) => l.event_type === "LOGOUT").length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              All Employee Log In & Log Out Audit Grid
            </h2>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 flex items-center gap-1 border border-sky-300">
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              Live Website Activity Register
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Real-time track of all website sign-in and sign-out timestamps across plant inspectors and administrators.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <RefreshCcw className="h-3.5 w-3.5 text-slate-500" /> Refresh Logs
        </button>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Log Events Recorded
            </span>
            <Clock className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
            {logs.length} Activity Logs
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Log In Events
            </span>
            <LogIn className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 tabular-nums">
            {totalLogins} Logins
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Log Out Events
            </span>
            <LogOut className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900 tabular-nums">
            {totalLogouts} Logouts
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
            placeholder="Search by Employee Name, ID, Department, or Designation…"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            {(["ALL", "LOGIN", "LOGOUT"] as const).map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => setEventFilter(ev)}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  eventFilter === ev
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {ev === "ALL" ? "All Logs" : ev === "LOGIN" ? "Logins Only" : "Logouts Only"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log In & Log Out Grid Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                <th className="p-3 font-bold w-28">Emp ID</th>
                <th className="p-3 font-bold min-w-[180px]">Employee Full Name</th>
                <th className="p-3 font-bold min-w-[180px]">Department & Designation</th>
                <th className="p-3 font-bold w-24">Role</th>
                <th className="p-3 font-bold w-32 text-center">Event Type</th>
                <th className="p-3 font-bold w-48">Date & Time Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {filtered.map((log) => {
                const logDate = new Date(log.timestamp);
                const isLogin = log.event_type === "LOGIN";

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    {/* Emp ID */}
                    <td className="p-3 font-mono font-bold text-sky-700">
                      <span className="rounded bg-sky-50 px-2 py-1 border border-sky-200">
                        {log.employee_number}
                      </span>
                    </td>

                    {/* Employee Name */}
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {log.full_name}
                      </div>
                    </td>

                    {/* Department & Designation */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{log.department}</div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {log.designation}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="p-3">
                      {log.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-300">
                          <Shield className="h-3 w-3 text-purple-600" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-300">
                          <UserCheck className="h-3 w-3 text-slate-500" /> Employee
                        </span>
                      )}
                    </td>

                    {/* Event Type */}
                    <td className="p-3 text-center">
                      {isLogin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 border border-emerald-300 shadow-2xs">
                          <LogIn className="h-3.5 w-3.5 text-emerald-600" /> LOG IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 border border-amber-300 shadow-2xs">
                          <LogOut className="h-3.5 w-3.5 text-amber-600" /> LOG OUT
                        </span>
                      )}
                    </td>

                    {/* Date & Time Timestamp */}
                    <td className="p-3 font-mono text-slate-800">
                      <div className="font-bold flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {format(logDate, "dd MMM yyyy, hh:mm:ss a")}
                      </div>
                      <span className="text-[10px] text-slate-400 pl-5">
                        {formatDistanceToNow(logDate, { addSuffix: true })}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-medium text-slate-500">
                    No log activity records matching your search and event filter.
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
