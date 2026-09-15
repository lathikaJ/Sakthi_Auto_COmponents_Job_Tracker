// src/routes/_authenticated/plans.tsx
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlanModal } from "@/components/plans/PlanModal";

export const Route = createFileRoute("/_authenticated/plans")({
  ssr: false,
  component: PlansPage,
});

function PlansPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [localTasks, setLocalTasks] = useState<any[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadLocal = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sakthi_excel_tasks_v8");
        if (stored) {
          try {
            setLocalTasks(JSON.parse(stored));
          } catch {}
        }
      }
    };
    loadLocal();
    window.addEventListener("excel_tasks_updated", loadLocal);
    return () => window.removeEventListener("excel_tasks_updated", loadLocal);
  }, []);

  // Fetch plans for the selected year
  const { data: dbPlans = [], isLoading } = useQuery({
    queryKey: ["auditPlans", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_plans")
        .select("*")
        .eq("year", year)
        .order("created_at", { ascending: false });
      if (error) console.warn("Notice loading DB audit_plans:", error);
      return data ?? [];
    },
  });

  const combinedPlans = [...dbPlans, ...localTasks.filter((t: any) => t.year === year || !t.year)].reduce((acc: any[], current: any) => {
    const key = current.id || current.audit_code;
    if (!acc.some((item) => (item.id || item.audit_code) === key)) {
      acc.push(current);
    }
    return acc;
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (planId) {
        await supabase.from("audit_plans").delete().eq("id", planId);
        await supabase.from("audit_assignments").delete().eq("id", planId);
      }
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sakthi_excel_tasks_v8");
        if (stored) {
          try {
            let tasks = JSON.parse(stored);
            tasks = tasks.filter((t: any) => t.id !== planId && t.audit_code !== planId);
            localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
            window.dispatchEvent(new Event("excel_tasks_updated"));
          } catch {}
        }
      }
    },
    onSuccess: () => {
      toast.success("Plan deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["auditPlans"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Error deleting plan");
    },
  });

  return (
    <AppShell title="Annual Plans" description="Create and manage yearly audit plans.">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Annual Audit Plan Creator</h2>
          <PlanModal />
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4 items-center">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Year</label>
            <select
              className="border rounded px-3 py-1.5 text-sm font-bold bg-white"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Month</label>
            <select
              className="border rounded px-3 py-1.5 text-sm font-bold bg-white"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Month {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Plans table */}
        {isLoading ? (
          <p className="text-muted-foreground">Loading plans…</p>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
            {combinedPlans.length === 0 ? (
              <p className="p-6 text-muted-foreground text-center">No plans found for the selected year. Click "+ Add Plan" to create one.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider font-extrabold text-slate-900 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-900">Year</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Month</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Audit Type</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Product / Process</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Department</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Planned Date</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Responsible</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {combinedPlans.map((plan: any, idx: number) => {
                    const id = plan.id || plan.plan_id || `plan-${idx}`;
                    return (
                      <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">{plan.year || year}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{plan.month || month}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{plan.audit_type || "Product Audit"}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{plan.product_process_name || plan.title || "Audit Plan"}</td>
                        <td className="px-4 py-3 text-slate-600">{plan.department || plan.area || "Quality Assurance"}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {plan.planned_date || plan.due_date ? new Date(plan.planned_date || plan.due_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {plan.responsible_employee_id || plan.assigned_to_employee_number || "688079"}
                        </td>
                        <td className="px-4 py-3 flex gap-2 items-center">
                          <PlanModal existingPlan={plan} />
                          <button
                            type="button"
                            className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                            onClick={() => deleteMutation.mutate(id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

