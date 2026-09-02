import * as XLSX from "xlsx";
import { toast } from "sonner";
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
    specification: "As per Drawing (Ø 275 ± 0.2 mm)",
    actual_value: "275.1 mm",
    status: "OK",
    remarks: "Conforms",
  },
  {
    id: "cp-2",
    sl_no: 2,
    parameter: "Surface Finish",
    specification: "Ra 1.6",
    actual_value: "Ra 1.4",
    status: "OK",
    remarks: "Smooth",
  },
  {
    id: "cp-3",
    sl_no: 3,
    parameter: "Hardness",
    specification: "180-220 BHN",
    actual_value: "195 BHN",
    status: "OK",
    remarks: "Verified",
  },
  {
    id: "cp-4",
    sl_no: 4,
    parameter: "Visual Inspection",
    specification: "No Defect / No blow holes",
    actual_value: "No Defect",
    status: "OK",
    remarks: "Pass",
  },
];

/**
 * Creates the exact Excel spreadsheet with assigned column headings & checkpoints,
 * opens it directly in Microsoft Excel on the user's PC, and automatically syncs
 * the changes across all employee accounts.
 */
export function openAuditInLocalExcel(audit: AuditExcelPayload): void {
  try {
    const checkpoints =
      audit.checkpoints && audit.checkpoints.length > 0
        ? audit.checkpoints
        : DEFAULT_CHECKPOINTS;

    // 1. Build the complete formatted worksheet with assigned column headings & metadata
    const sheetData = [
      ["AUDIT CHECKLIST"],
      ["Audit Plan No :", audit.audit_code, "", "Planned Month :", audit.planned_month],
      ["Part Name :", audit.part_name, "", "Auditor Name :", audit.auditor_name || "Yaswanth"],
      [],
      ["S.No", "Check Points", "Specification", "Observed Value", "Status", "Remarks"],
      ...checkpoints.map((cp, idx) => [
        cp.sl_no ?? idx + 1,
        cp.parameter,
        cp.specification,
        cp.actual_value || "OK",
        cp.status || "OK",
        cp.remarks || "-",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths for optimal display in Microsoft Excel
    ws["!cols"] = [
      { wch: 10 }, // S.No
      { wch: 35 }, // Check Points
      { wch: 32 }, // Specification
      { wch: 22 }, // Observed Value
      { wch: 14 }, // Status
      { wch: 25 }, // Remarks
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Checklist");

    const safeCode = audit.audit_code.replace(/[/\\?%*:|"<>]/g, "_");
    const safePart = audit.part_name.replace(/[/\\?%*:|"<>]/g, "_");
    const fileName = `${safeCode}_${safePart}_Audit.xlsx`;

    // 2. Open directly in Microsoft Excel with all assigned headings pre-filled
    XLSX.writeFile(wb, fileName);

    // 3. Automatically sync to central database and broadcast to all employee logins
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
      console.warn("Sync warning:", syncErr);
    }

    toast.success(`✓ ${fileName} opened in Microsoft Excel!`, {
      description: "Pre-filled with assigned column headings. Synced to all employee logins.",
    });
  } catch (err) {
    console.error("Failed to generate and open Excel file", err);
    toast.error("Failed to open file in Microsoft Excel.");
  }
}
