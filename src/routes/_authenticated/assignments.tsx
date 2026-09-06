import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { ExcelTaskGrid } from "@/components/excel/ExcelTaskGrid";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { DEFAULT_OFFICIAL_AUDITS, mergeAndDeduplicateTasks } from "@/lib/audit";

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
              const clean = mergeAndDeduplicateTasks(parsed);
              setLocalExcelTasks(clean);
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

  const initialRows = mergeAndDeduplicateTasks(
    dbRows.length > 0
      ? [...dbRows, ...localExcelTasks.filter((lt) => !dbRows.some((db: any) => db.audit_code === lt.audit_code))]
      : localExcelTasks.length > 0
        ? localExcelTasks
        : DEFAULT_OFFICIAL_AUDITS
  );

  return (
    <AppShell
      title="Monthly Assignment Matrix — Microsoft Excel (.xlsx) Compatible"
      description="View online or click 'Download MS Excel (.xlsx)' to edit in Microsoft Excel on your computer and upload back anytime."
    >
      <div className="space-y-6">
        <ExcelTaskGrid
          initialRows={initialRows}
          isAdmin={isAdmin}
          currentEmployeeNumber={profile?.employee_number || ""}
          title="Master Audit Task Register — Microsoft Excel (.xlsx)"
          description="Download standard .xlsx sheets for Microsoft Excel, fill offline on your PC, and upload back to sync."
          onRefresh={() => assignments.refetch()}
        />
      </div>
    </AppShell>
  );
}
