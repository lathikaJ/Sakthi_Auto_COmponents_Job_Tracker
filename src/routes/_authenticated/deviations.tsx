import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/deviations")({
  component: DeviationsPage,
});

export type DeviationItem = {
  id: string;
  dev_code: string;
  description: string;
  observed_condition: string;
  location_operation: string;
  employee_number: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "open" | "under_review" | "closed";
  corrective_action: string;
  recommended_action: string;
  created_at: string;
};

// No default/dummy deviations — live data only

const EMPLOYEE_LIST = ["690867", "688079", "663875", "710250", "666468", "665773", "665965", "708818", "667685"];

function DeviationsPage() {
  const { profile, isAdmin } = useAuth();
  const [deviations, setDeviations] = useState<DeviationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Deviation Form State
  const [formData, setFormData] = useState({
    title: "",
    observed_condition: "",
    location: "Machine Shop - Line 1",
    severity: "Medium" as "Low" | "Medium" | "High" | "Critical",
    assigned_emp: profile?.employee_number || "1002",
    corrective_action: "",
    recommended_action: "",
  });

  // Load stored deviations — no dummy fallbacks, always start clean
  const loadDeviations = () => {
    if (typeof window !== "undefined") {
      // Purge any old dummy demo records on first load
      const stored = localStorage.getItem("sakthi_deviations");
      if (stored) {
        try {
          const parsed: DeviationItem[] = JSON.parse(stored);
          // Filter out any stale demo-dev-* records from previous sessions
          const live = parsed.filter((d) => !d.id.startsWith("demo-dev-"));
          if (live.length !== parsed.length) {
            // Save purged list back
            localStorage.setItem("sakthi_deviations", JSON.stringify(live));
          }
          setDeviations(live);
          return;
        } catch {
          // Fall through to empty state
        }
      }
    }
    setDeviations([]);
  };

  useEffect(() => {
    loadDeviations();
    const handleUpdate = () => loadDeviations();
    window.addEventListener("sakthi_deviations_updated", handleUpdate);

    // Check if navigated here from audit page with pre-filled data
    if (typeof window !== "undefined") {
      const prefillRaw = localStorage.getItem("sakthi_deviation_prefill");
      if (prefillRaw) {
        try {
          const prefill = JSON.parse(prefillRaw);
          setFormData({
            title: prefill.title || "",
            observed_condition: prefill.observed_condition || "",
            location: prefill.location || "Audit Checkpoint",
            severity: prefill.severity || "High",
            assigned_emp: prefill.assigned_emp || profile?.employee_number || "690867",
            corrective_action: "",
            recommended_action: "",
          });
          setIsModalOpen(true);
          // Consume and clear the prefill
          localStorage.removeItem("sakthi_deviation_prefill");
        } catch {
          // Ignore parse errors
        }
      }
    }

    return () => window.removeEventListener("sakthi_deviations_updated", handleUpdate);
  }, []);

  // Save changes to localStorage
  const saveDeviationsList = async (updatedList: DeviationItem[]) => {
    setDeviations(updatedList);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_deviations", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("sakthi_deviations_updated"));
    }
  };

  // Handle Create Deviation Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a deviation title.");
      return;
    }

    const newCode = `DEV-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newDev: DeviationItem = {
      id: `dev-${Date.now()}`,
      dev_code: newCode,
      description: formData.title,
      observed_condition: formData.observed_condition || "Non-conformance identified during plant operation.",
      location_operation: formData.location,
      employee_number: formData.assigned_emp,
      severity: formData.severity,
      status: "open",
      corrective_action: formData.corrective_action || "Immediate containment action initiated.",
      recommended_action: formData.recommended_action || "Preventative action under evaluation.",
      created_at: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),
    };

    const updated = [newDev, ...deviations];
    await saveDeviationsList(updated);

    // Reset Form & Close Modal
    setFormData({
      title: "",
      observed_condition: "",
      location: "Machine Shop - Line 1",
      severity: "Medium",
      assigned_emp: profile?.employee_number || "1002",
      corrective_action: "",
      recommended_action: "",
    });
    setIsModalOpen(false);
    toast.success(`Deviation ${newCode} successfully created and assigned to Emp #${newDev.employee_number}!`);
  };

  // Status update
  const handleStatusChange = async (id: string, newStatus: "open" | "under_review" | "closed") => {
    const updated = deviations.map((d) => (d.id === id ? { ...d, status: newStatus } : d));
    await saveDeviationsList(updated);
    toast.success(`Deviation status updated to '${newStatus.replace("_", " ")}'`);
  };

  // Delete deviation (Admin only)
  const handleDeleteDeviation = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only Admin can delete deviation records.");
      return;
    }
    const updated = deviations.filter((d) => d.id !== id);
    await saveDeviationsList(updated);
    toast.info("Deviation record removed by Admin.");
  };

  // Filtered rows
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
      description="Insert non-conformances, record 5-Why root cause analysis, assign corrective action plans, and track resolution across plant lines."
    >
      <div className="space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Plant Non-Conformance & Deviation Register
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Log quality non-conformances, specify CAPA corrective actions, and assign responsible engineers.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-brand font-bold text-white hover:bg-brand-hover shadow-sm"
          >
            <Plus className="h-4 w-4" /> Insert New Deviation
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

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All ({deviations.length})
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === "open"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter("under_review")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === "under_review"
                  ? "bg-sky-600 text-white"
                  : "bg-sky-50 text-sky-800 hover:bg-sky-100"
              }`}
            >
              Under Review ({reviewCount})
            </button>
            <button
              onClick={() => setStatusFilter("closed")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === "closed"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
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
                  <th className="p-3 min-w-[240px] font-bold">Description & Condition</th>
                  <th className="p-3 w-36 font-bold">Area / Line</th>
                  <th className="p-3 w-28 font-bold">Severity</th>
                  <th className="p-3 w-32 font-bold">Assigned Emp</th>
                  <th className="p-3 w-32 font-bold">Status</th>
                  <th className="p-3 min-w-[200px] font-bold">CAPA Corrective Action</th>
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
                        <div className="text-xs text-slate-600 font-medium line-clamp-2">
                          {dev.observed_condition}
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
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          Emp #{dev.employee_number}
                        </div>
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
                      <td className="p-3 text-xs font-medium text-slate-700">
                        {dev.corrective_action}
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
                    <td colSpan={8} className="p-8 text-center text-sm font-semibold text-slate-500">
                      No deviation records match your criteria. Click '+ Insert New Deviation' to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Insert New Deviation */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" /> Insert New Plant Deviation
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800">Deviation Title / Summary *</label>
                  <Input
                    required
                    placeholder="e.g. Crankshaft Journal #3 Diameter Exceeds Upper Spec Limit"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 border-slate-300 text-xs font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800">Location / Plant Line</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="mt-1 border-slate-300 text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800">Severity</label>
                    <select
                      value={formData.severity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          severity: e.target.value as "Low" | "Medium" | "High" | "Critical",
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-brand"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800">Assigned Responsible Employee</label>
                  <select
                    value={formData.assigned_emp}
                    onChange={(e) => setFormData({ ...formData, assigned_emp: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-brand"
                  >
                    {EMPLOYEE_LIST.map((emp) => (
                      <option key={emp} value={emp}>
                        Emp #{emp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800">Observed Non-Conformance</label>
                  <textarea
                    rows={2}
                    placeholder="Describe what non-conformance condition was observed..."
                    value={formData.observed_condition}
                    onChange={(e) => setFormData({ ...formData, observed_condition: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800">CAPA Corrective Action Plan</label>
                  <textarea
                    rows={2}
                    placeholder="Immediate containment or corrective actions taken..."
                    value={formData.corrective_action}
                    onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand"
                  />
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
                  <Button type="submit" className="bg-brand text-xs font-bold text-white hover:bg-brand-hover shadow-sm">
                    Submit & Insert Deviation
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
