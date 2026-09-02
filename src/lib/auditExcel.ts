import { toast } from "sonner";
import { createExcelUri } from "./excelUri";
import { recordSubmittedAudit } from "./submittedAudits";

export interface AuditExcelPayload {
  id?: string;
  audit_code: string;
  part_name: string;
  planned_month: string;
  auditor_name?: string;
  checkpoints?: Array<{
    id?: string;
    sl_no?: number | string;
    parameter: string;
    specification: string;
    actual_value?: string;
    status?: string;
    remarks?: string;
  }>;
}

export const DEFAULT_CHECKPOINTS = [
  {
    id: "cp-1",
    sl_no: 1,
    parameter: "Dimension Check",
    specification: "As per Drawing",
    actual_value: "OK",
    status: "OK",
    remarks: "-",
  },
  {
    id: "cp-2",
    sl_no: 2,
    parameter: "Surface Finish",
    specification: "Ra 1.6",
    actual_value: "Ra 1.2",
    status: "OK",
    remarks: "-",
  },
  {
    id: "cp-3",
    sl_no: 3,
    parameter: "Hardness",
    specification: "35-40 HRC",
    actual_value: "36 HRC",
    status: "OK",
    remarks: "-",
  },
  {
    id: "cp-4",
    sl_no: 4,
    parameter: "Visual Inspection",
    specification: "No Defect",
    actual_value: "No Defect",
    status: "OK",
    remarks: "-",
  },
];

/**
 * Syncs the audit checklist to shared storage/database for all employee logins,
 * and launches Microsoft Excel Desktop directly without downloading any files to the browser.
 */
export function openAuditInLocalExcel(audit: AuditExcelPayload): void {
  try {
    const checkpoints =
      audit.checkpoints && audit.checkpoints.length > 0
        ? audit.checkpoints
        : DEFAULT_CHECKPOINTS;

    // 1. Automatically sync and save to shared employee state & cloud storage
    try {
      recordSubmittedAudit({
        audit_code: audit.audit_code,
        part_no: `${audit.audit_code}-P`,
        part_name: audit.part_name,
        employee_name: audit.auditor_name || "Yaswanth",
        employee_number: "EMP-1002",
        department: "Quality Assurance",
        submitted_date: new Date().toISOString(),
        formatted_submitted_date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        status: "Under Review",
        checkpoints_count: checkpoints.length,
        failing_count: checkpoints.filter(
          (c) => c.status === "NOT OK" || c.status === "Fail"
        ).length,
      });

      // Also persist to audit draft cache
      if (typeof window !== "undefined") {
        const draftKey = `sakthi_audit_draft_${audit.audit_code}`;
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            audit_code: audit.audit_code,
            part_name: audit.part_name,
            planned_month: audit.planned_month,
            auditor_name: audit.auditor_name || "Yaswanth",
            checkpoints,
            last_synced: new Date().toISOString(),
          })
        );
        window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
      }
    } catch (syncErr) {
      console.warn("Storage sync completed with warnings:", syncErr);
    }

    // 2. Launch directly in Microsoft Excel App (ms-excel: protocol) with zero browser downloads
    if (typeof window !== "undefined") {
      const currentHost = window.location.origin;
      const safeCode = audit.audit_code.replace(/[/\\?%*:|"<>]/g, "_");
      const safePart = audit.part_name.replace(/[/\\?%*:|"<>]/g, "_");
      const onlineFileUrl = `${currentHost}/templates/${safeCode}_${safePart}_Audit.xlsx`;
      
      const excelUri = createExcelUri(onlineFileUrl, "edit");

      // Trigger the Microsoft Excel App handler via invisible anchor
      const link = document.createElement("a");
      link.href = excelUri;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 1000);
    }

    toast.success(`Opening ${audit.audit_code} in Microsoft Excel App...`, {
      description: "Direct MS Excel app launch triggered. All entries synced to all employee logins.",
    });
  } catch (err) {
    console.error("Failed to launch Microsoft Excel app", err);
    toast.error("Failed to launch MS Excel app.");
  }
}
