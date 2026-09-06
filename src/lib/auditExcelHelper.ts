import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "sonner";

export interface AuditDownloadInfo {
  id?: string;
  audit_code: string;
  title: string;
  audit_type: string;
  area: string;
  assigned_to_employee_number?: string;
  due_date?: string;
}

const DEFAULT_CHECKPOINTS_BY_TYPE: Record<string, Array<{ param: string; spec: string; method: string }>> = {
  Product: [
    { param: "HARDNESS (MSIL QF/08/CQA-09)", spec: "164 ~ 188 BHN / 85 ~ 91HRB", method: "Brinell Hardness Tester" },
    { param: "MICROSTRUCTURE SPHEROIDIZATION & PEARLITE", spec: "Spheroidization >=80%, Pearlite 10-40%", method: "Metallurgical Microscope" },
    { param: "TENSILE STRENGTH", spec: "500 MPa MIN", method: "UTM Extensometer" },
    { param: "YIELD STRENGTH @ 0.2% & 0.5%", spec: "@ 0.2%: 320 MPa MIN, @ 0.5%: 340 MPa MIN", method: "UTM Extensometer" },
    { param: "ELONGATION & IMPACT STRENGTH", spec: "Elongation >=10%, Impact >=8J/cm²", method: "Charpy Impact Tester" },
    { param: "RECEIVING INSPECTION (APPEARANCE)", spec: "Free of crack/flaw/rust; Legible letters", method: "Visual / Vernier" },
    { param: "PAINTING & SURFACE INTEGRITY", spec: "Black dip painting; No peel off / damages", method: "Visual 10-point" },
  ],
  Process: [
    { param: "MASTER SAMPLE COMPARISON (QF/08/CQA-37)", spec: "Should be compared with master sample", method: "Visual Comparison" },
    { param: "APPEARANCE 10-POINT CHECK", spec: "No blow hole, no pin hole/slag, no sharp edge, no dent", method: "Visual 10-point" },
    { param: "RP OIL CONDITION VERIFICATION", spec: "No excess oil, no dust/burr/foreign particles", method: "Visual / Touch" },
    { param: "PACKING BOX & VCI COVER CONDITION", spec: "Proper center pad/foam, no damage, no water", method: "Visual inspection" },
    { param: "PACKING OF PARTS VERIFICATION", spec: "Qty per layer = 24, Qty per box = 144", method: "Counting & Tag" },
    { param: "PART MIXUP PREVENTION & POKA-YOKE", spec: "Sensor active, zero mixup risk", method: "Functional test" },
  ],
  Revalidation: [
    { param: "EQUIPMENT CALIBRATION VALIDITY", spec: "Calibration due date not exceeded", method: "Certificate Check" },
    { param: "PROCESS CAPABILITY Cpk VERIFICATION", spec: "Cpk >= 1.33 for critical dimensions", method: "Statistical Run" },
    { param: "FURNACE / CYCLE PARAMETER CHECK", spec: "Within validated temperature window", method: "Data logger" },
    { param: "LAYOUT INSPECTION OF SAMPLE PART", spec: "100% drawing dimensions conform", method: "CMM Inspection" },
    { param: "DOCUMENTATION & TRACEABILITY UPDATE", spec: "Valid route card, revalidation report filed", method: "Document Review" },
  ],
};

/**
 * Generates and downloads the official Sakthi Auto Excel spreadsheet (.xlsx) for an assigned audit.
 */
export function downloadAssignedAuditExcel(audit: AuditDownloadInfo): void {
  try {
    const todayStr = format(new Date(), "dd.MM.yyyy");
    const auditType = audit.audit_type || "Product";
    const checkpoints = (DEFAULT_CHECKPOINTS_BY_TYPE[auditType] || DEFAULT_CHECKPOINTS_BY_TYPE["Product"]) ?? [];

    const wsData: any[][] = [
      // Row 1: Brand & Document Header
      ["SAKTHI AUTO", "", "", "AUDIT INSPECTION CHECK LIST CUM REPORT", "", "", "", "", "", `PAGE : 1 OF 1`, ""],
      ["", "", "", `(${auditType.toUpperCase()} AUDIT)`, "", "", "", "", "", `DATE : ${todayStr}`, ""],
      // Row 3: Customer & Date
      ["CUSTOMER", `: SAKTHI / OEM`, "", "", "", "", "", "", `DUE DATE : ${audit.due_date || todayStr}`, "", ""],
      // Row 4: Part Name & Area
      ["PART / AUDIT TITLE", `: ${audit.title}`, "", "", "", "", "", "", `DEPARTMENT / AREA : ${audit.area || "General"}`, "", ""],
      // Row 5: Part No / Code & Auditor
      ["AUDIT CODE", `: ${audit.audit_code}`, "", "", "", "", "", `(REV: A)`, `AUDITOR : Emp #${audit.assigned_to_employee_number || "688079"}`, "", ""],
      // Row 6: Spacer
      ["", "", "", "", "", "", "", "", "", "", ""],
      // Row 7: Main Table Column Header (Level 1)
      ["SL. NO.", "CHARACTERISTICS / CHECKPOINT", "SPECIFICATION", "CHECK METHOD", "OBSERVATION", "", "", "", "", "OK", "NOT OK", "REMARKS"],
      // Row 8: Observation Sub-headers (1 LH, 2 LH, 3 LH, 1 RH, 2 RH, 3 RH)
      ["", "", "", "", "1 LH", "2 LH", "3 LH", "1 RH", "2 RH", "3 RH", "", "", ""],
    ];

    // Checkpoint rows
    checkpoints.forEach((cp, idx) => {
      wsData.push([
        idx + 1,
        cp.param,
        cp.spec,
        cp.method,
        "", // 1 LH
        "", // 2 LH
        "", // 3 LH
        "", // 1 RH
        "", // 2 RH
        "", // 3 RH
        "", // OK
        "", // NOT OK
        "OK", // Remarks
      ]);
    });

    // Document footer
    wsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
    wsData.push(["QF/08/CQA-55, Rev.No: 02 dt 29.12.2016", "", "", "", "", "", "", "", "", "", "", ""]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
      { wch: 8 },  // SL. NO.
      { wch: 38 }, // CHARACTERISTICS
      { wch: 38 }, // SPECIFICATION
      { wch: 22 }, // CHECK METHOD
      { wch: 10 }, // 1 LH
      { wch: 10 }, // 2 LH
      { wch: 10 }, // 3 LH
      { wch: 10 }, // 1 RH
      { wch: 10 }, // 2 RH
      { wch: 10 }, // 3 RH
      { wch: 8 },  // OK
      { wch: 9 },  // NOT OK
      { wch: 20 }, // REMARKS
    ];

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 3 }, e: { r: 1, c: 8 } },
      { s: { r: 6, c: 4 }, e: { r: 6, c: 9 } },
      { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } },
      { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } },
      { s: { r: 6, c: 2 }, e: { r: 7, c: 2 } },
      { s: { r: 6, c: 3 }, e: { r: 7, c: 3 } },
      { s: { r: 6, c: 10 }, e: { r: 7, c: 10 } },
      { s: { r: 6, c: 11 }, e: { r: 7, c: 11 } },
      { s: { r: 6, c: 12 }, e: { r: 7, c: 12 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Audit Inspection");

    const fileName = `Sakthi_Auto_${audit.audit_code.replace(/[^a-zA-Z0-9_-]/g, "_")}_Inspection.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`✓ Downloaded assigned Excel file: ${fileName}`, {
      description: "Complete and save this Excel file locally before exporting.",
      duration: 4000,
    });
  } catch (err: any) {
    toast.error("Failed to generate Excel file: " + (err?.message || "Unknown error"));
  }
}
