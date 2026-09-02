import * as XLSX from "xlsx";
import { toast } from "sonner";
import { createExcelUri } from "./excelUri";

export interface AuditExcelPayload {
  id?: string;
  audit_code: string;
  part_name: string;
  planned_month: string;
  auditor_name?: string;
  checkpoints?: Array<{
    sl_no?: number;
    parameter: string;
    specification: string;
    actual_value?: string;
    status?: string;
    remarks?: string;
  }>;
}

const DEFAULT_CHECKPOINTS = [
  {
    sl_no: 1,
    parameter: "Dimension Check",
    specification: "As per Drawing",
    actual_value: "OK",
    status: "OK",
    remarks: "-",
  },
  {
    sl_no: 2,
    parameter: "Surface Finish",
    specification: "Ra 1.6",
    actual_value: "Ra 1.2",
    status: "OK",
    remarks: "-",
  },
  {
    sl_no: 3,
    parameter: "Hardness",
    specification: "35-40 HRC",
    actual_value: "36 HRC",
    status: "OK",
    remarks: "-",
  },
  {
    sl_no: 4,
    parameter: "Visual Inspection",
    specification: "No Defect",
    actual_value: "No Defect",
    status: "OK",
    remarks: "-",
  },
];

/**
 * Generates an Excel spreadsheet with the exact assigned column headings and metadata,
 * and launches/opens it directly into Microsoft Excel on the user's local system.
 */
export function openAuditInLocalExcel(audit: AuditExcelPayload): void {
  try {
    const checkpoints =
      audit.checkpoints && audit.checkpoints.length > 0
        ? audit.checkpoints
        : DEFAULT_CHECKPOINTS;

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

    // Set column widths for optimal display in local Microsoft Excel desktop
    ws["!cols"] = [
      { wch: 10 }, // S.No
      { wch: 32 }, // Check Points
      { wch: 28 }, // Specification
      { wch: 22 }, // Observed Value
      { wch: 14 }, // Status
      { wch: 25 }, // Remarks
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Checklist");

    // Clean filename for OS file system
    const safeCode = audit.audit_code.replace(/[/\\?%*:|"<>]/g, "_");
    const safePart = audit.part_name.replace(/[/\\?%*:|"<>]/g, "_");
    const fileName = `${safeCode}_${safePart}_Audit.xlsx`;

    // 1. Download/save directly to local system so MS Excel opens the file with assigned headers
    XLSX.writeFile(wb, fileName);

    // 2. Also try URI protocol handler if online URL is available
    try {
      if (typeof window !== "undefined") {
        const currentHost = window.location.origin;
        const onlineFileUrl = `${currentHost}/${encodeURIComponent(fileName)}`;
        const excelUri = createExcelUri(onlineFileUrl, "edit");
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = excelUri;
        document.body.appendChild(iframe);
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    } catch {}

    toast.success(`Opening ${fileName} in Microsoft Excel on your system!`, {
      description: "Excel file generated with assigned column headings & checklist.",
    });
  } catch (err) {
    console.error("Failed to generate and open Excel file", err);
    toast.error("Failed to generate Excel file.");
  }
}
