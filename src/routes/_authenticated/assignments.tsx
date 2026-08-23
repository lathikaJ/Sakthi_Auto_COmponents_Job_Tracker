import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { ExcelTaskGrid } from "@/components/excel/ExcelTaskGrid";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { DEFAULT_OFFICIAL_AUDITS } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { isAdmin, profile } = useAuth();

  const assignments = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_assignments")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const dbRows = assignments.data ?? [];

  const [localExcelTasks, setLocalExcelTasks] = useState<any[]>([]);

  useEffect(() => {
    const loadStored = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sakthi_excel_tasks_v8");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLocalExcelTasks(parsed);
            }
          } catch {
            // Ignore
          }
        }
      }
    };
    loadStored();
    window.addEventListener("excel_tasks_updated", loadStored);
    return () => window.removeEventListener("excel_tasks_updated", loadStored);
  }, []);

  const initialRows = localExcelTasks.length > 0
    ? localExcelTasks
    : dbRows.length > 0
    ? dbRows
    : DEFAULT_OFFICIAL_AUDITS;

  return (
    <AppShell
      title="Monthly Assignment Matrix"
      description="Interactive built-in Excel spreadsheet for assigning tasks, updating schedules, and importing/exporting audit plans."
    >
      <div className="space-y-6">
        <ExcelTaskGrid
          initialRows={initialRows}
          isAdmin={isAdmin}
          currentEmployeeNumber={profile?.employee_number || ""}
          title="Monthly Task Assignment Sheet (Built-in Excel)"
          description="Admin can update task titles, assign employee IDs, change audit statuses, and import/export Excel sheets in real time."
          onRefresh={() => assignments.refetch()}
        />
      </div>
    </AppShell>
  );
}
