// src/routes/_authenticated/plans.tsx
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlanModal } from "@/components/plans/PlanModal";

export const Route = createFileRoute("/_authenticated/plans")({
  component: PlansPage,
});

function PlansPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(1);
  const queryClient = useQueryClient();

  // Fetch plans for the selected year
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["auditPlans", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_plans")
        .select("*")
        .eq("year", year)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from("audit_plans").delete().eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["auditPlans"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Error deleting plan");
    },
  });

  return (
    <AppShell title="Annual Plans" description="Create and manage yearly audit plans.">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Annual Plan Creator</h2>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <select
            className="border rounded px-2 py-1"
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
          <select
            className="border rounded px-2 py-1"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        {/* Add Plan button */}
        <PlanModal />
        {/* Plans table */}
        {isLoading ? (
          <p className="text-muted-foreground">Loading plans…</p>
        ) : (
          <div className="border rounded overflow-x-auto bg-card">
            {plans.length === 0 ? (
              <p className="p-4 text-muted-foreground">No plans for the selected period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Year</th>
                    <th className="px-4 py-2">Month</th>
                    <th className="px-4 py-2">Audit Type</th>
                    <th className="px-4 py-2">Product / Process</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Planned Date</th>
                    <th className="px-4 py-2">Responsible</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan: any) => (
                    <tr key={plan.plan_id} className="border-t border-border hover:bg-secondary/60">
                      <td className="px-4 py-2">{plan.year}</td>
                      <td className="px-4 py-2">{plan.month}</td>
                      <td className="px-4 py-2 text-muted-foreground">{plan.audit_type}</td>
                      <td className="px-4 py-2 text-muted-foreground">{plan.product_process_name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{plan.department}</td>
                      <td className="px-4 py-2 text-muted-foreground">{new Date(plan.planned_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-muted-foreground">{plan.responsible_employee_id}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <PlanModal existingPlan={plan} />
                        <button
                          className="px-2 py-1 text-sm text-red-600 hover:underline"
                          onClick={() => deleteMutation.mutate(plan.plan_id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
