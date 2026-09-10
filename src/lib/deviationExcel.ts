import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "sonner";
import { DeviationItem, DeviationObservationItem, DeviationCapaItem } from "@/routes/_authenticated/deviations";

export const DEFAULT_EXCEL_OBSERVATIONS: DeviationObservationItem[] = [
  {
    sl_no: 1,
    specification: "Knuckle Bore Dia Ø 62.00 +0.02 / +0.05 mm",
    obs1: "62.05",
    obs2: "62.06",
    obs3: "62.06",
    obs4: "62.05",
    obs5: "62.07",
    obs6: "62.06",
    remarks: "Oversize by 0.01 ~ 0.02 mm",
  },
  {
    sl_no: 2,
    specification: "Strut Mounting Surface Flatness < 0.05 mm",
    obs1: "0.03",
    obs2: "0.04",
    obs3: "0.05",
    obs4: "0.04",
    obs5: "0.06",
    obs6: "0.05",
    remarks: "Sample #5 out of tolerance",
  },
  {
    sl_no: 3,
    specification: "Caliper Mounting Hole Pitch 120.0 ± 0.1 mm",
    obs1: "120.05",
    obs2: "120.08",
    obs3: "120.02",
    obs4: "120.06",
    obs5: "120.04",
    obs6: "120.07",
    remarks: "Within specified limit",
  },
];

export const DEFAULT_EXCEL_CAPA_ITEMS: DeviationCapaItem[] = [
  {
    date: format(new Date(), "yyyy-MM-dd"),
    part_name: "STEERING KNUCKLE",
    part_no: "45110-M86R00",
    non_conformance: "Bore Oversize (+0.01 ~ 0.02mm) observed in sample #5 & #6",
    root_cause: "Insert tip wear out during long run machining & coolant jet misaligned",
    corrective_action: "Replaced tool insert, realigned coolant jet nozzle, and 100% re-inspected lot.",
  },
];

/**
 * Generates the official 2-Page Sakthi Auto Deviation Report Workbook
 * Sheet 1: Page 1 - Deviation Report (QF/08/CQA-55)
 * Sheet 2: Page 2 - RCA, CAPA & Quarantine Details
 */
export function generateDeviationExcelWorkbook(data?: Partial<DeviationItem>): XLSX.WorkBook {
  let todayStr = "10.09.2026";
  try {
    todayStr = format(new Date(), "dd.MM.yyyy");
  } catch (_) {}

  const reportDate = data?.report_date || data?.created_at || todayStr;
  const fromDept = data?.from_dept || "QUALITY ASSURANCE / LINE 1";
  const toDept = data?.to_dept || "PRODUCTION & MANUFACTURING";
  const partName = data?.part_name || "STEERING KNUCKLE";
  const partNumber = data?.part_number || "45110-M86R00";
  const stage = data?.stage || "INPROCESS";
  const devTitle = data?.description || "Steering Knuckle Bore Oversize Non-Conformance";
  const cc = data?.cc || "PLANT HEAD, QA MANAGER, PRODUCTION INCHARGE";
  const docCode = data?.doc_code || "QF/08/CQA-55";
  const docDate = data?.doc_date || "25.12.2015";
  const inspectedBy = data?.inspected_by || "SILAMBARASAN S (688079)";
  const approvedBy = data?.approved_by || "KARTHIKEYAN C (690867)";

  const observations = (data?.observations && data.observations.length > 0)
    ? data.observations
    : DEFAULT_EXCEL_OBSERVATIONS;

  const capaItems = (data?.capa_items && data.capa_items.length > 0)
    ? data.capa_items
    : DEFAULT_EXCEL_CAPA_ITEMS;

  const segQty = data?.quarantine_segregated_qty || data?.segregated_qty || "100";
  const okQty = data?.quarantine_ok_qty || data?.ok_qty || "95";
  const notOkQty = data?.quarantine_not_ok_qty || data?.ng_qty || "5";
  const segBy = data?.quarantine_segregated_by || data?.segregated_by || inspectedBy;
  const quarantineApprovedBy = data?.quarantine_approved_by || approvedBy;

  // ---------------------------------------------------------
  // SHEET 1: PAGE 1 DEVIATION REPORT (QF/08/CQA-55)
  // ---------------------------------------------------------
  const sheet1Data: any[][] = [
    ["SAKTHI AUTO", "", "", "DEVIATION REPORT", "", "", "", "", "DATE : " + reportDate],
    ["", "", "", "(QF/08/CQA-55)", "", "", "", "", ""],
    ["FROM", ": " + fromDept, "", "", "", "TO", ": " + toDept, "", ""],
    ["PART NAME", ": " + partName, "", "", "", "PART NUMBER", ": " + partNumber, "", ""],
    ["DEVIATION TITLE / SUMMARY", ": " + devTitle, "", "", "", "STAGE", ": " + stage, "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["OBSERVATION MATRIX TABLE (SAMPLE OBSERVATIONS 1..6)", "", "", "", "", "", "", "", ""],
    ["SL. NO.", "SPECIFICATION", "OBSERVATION (SAMPLES 1 TO 6)", "", "", "", "", "", "REMARKS"],
    ["", "", "1", "2", "3", "4", "5", "6", ""],
  ];

  observations.forEach((obs, index) => {
    sheet1Data.push([
      obs.sl_no || index + 1,
      obs.specification || "",
      obs.obs1 || "",
      obs.obs2 || "",
      obs.obs3 || "",
      obs.obs4 || "",
      obs.obs5 || "",
      obs.obs6 || "",
      obs.remarks || "",
    ]);
  });

  sheet1Data.push(["", "", "", "", "", "", "", "", ""]);
  sheet1Data.push(["CC : (CARBON COPY TO DEPARTMENTS)", ": " + cc, "", "", "", "", "", "", ""]);
  sheet1Data.push(["", "", "", "", "", "", "", "", ""]);
  sheet1Data.push(["DOCUMENT CODE: " + docCode, "", "", "EFFECTIVE DATE: " + docDate, "", "", "", "", ""]);
  sheet1Data.push(["INSPECTED BY", ": " + inspectedBy, "", "", "", "APPROVED BY", ": " + approvedBy, "", ""]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  ws1["!cols"] = [
    { wch: 8 },   // SL. NO.
    { wch: 36 },  // SPECIFICATION
    { wch: 10 },  // 1
    { wch: 10 },  // 2
    { wch: 10 },  // 3
    { wch: 10 },  // 4
    { wch: 10 },  // 5
    { wch: 10 },  // 6
    { wch: 30 },  // REMARKS
  ];

  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 3 }, e: { r: 1, c: 7 } },
    { s: { r: 7, c: 2 }, e: { r: 7, c: 7 } },
    { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },
    { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } },
    { s: { r: 7, c: 8 }, e: { r: 8, c: 8 } },
  ];

  // ---------------------------------------------------------
  // SHEET 2: PAGE 2 RCA, CAPA & QUARANTINE DETAILS
  // ---------------------------------------------------------
  const sheet2Data: any[][] = [
    ["SAKTHI AUTO", "", "ROOT CAUSE, CORRECTIVE ACTION (CAPA) & QUARANTINE DETAILS", "", "", "PAGE : 2 OF 2"],
    ["", "", "", "", "", ""],
    ["NON-CONFORMANCE & CORRECTIVE ACTION LOG", "", "", "", "", ""],
    ["DATE", "PART NAME", "PART NO.", "NON CONFORMANCE DETAILS", "ROOT CAUSE", "CORRECTIVE ACTION"],
  ];

  capaItems.forEach((item) => {
    sheet2Data.push([
      item.date || reportDate,
      item.part_name || partName,
      item.part_no || partNumber,
      item.non_conformance || "",
      item.root_cause || "",
      item.corrective_action || "",
    ]);
  });

  sheet2Data.push(["", "", "", "", "", ""]);
  sheet2Data.push(["QUARANTINE DETAILS", "", "", "", "", ""]);
  sheet2Data.push(["SEGREGATED QTY", "OK QTY", "NOT OK QTY", "", "", ""]);
  sheet2Data.push([segQty + " PCS", okQty + " PCS", notOkQty + " PCS", "", "", ""]);
  sheet2Data.push(["", "", "", "", "", ""]);
  sheet2Data.push(["SEGREGATED BY", ": " + segBy, "", "APPROVED BY", ": " + quarantineApprovedBy, ""]);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

  ws2["!cols"] = [
    { wch: 14 },  // DATE / SEGREGATED QTY
    { wch: 24 },  // PART NAME / OK QTY
    { wch: 18 },  // PART NO / NOT OK QTY
    { wch: 36 },  // NON CONFORMANCE DETAILS
    { wch: 36 },  // ROOT CAUSE
    { wch: 38 },  // CORRECTIVE ACTION
  ];

  ws2["!merges"] = [
    { s: { r: 0, c: 2 }, e: { r: 0, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 5 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Page 1 - Deviation Report");
  XLSX.utils.book_append_sheet(wb, ws2, "Page 2 - RCA & CAPA");

  return wb;
}

/**
 * Triggers opening the 2-Page Deviation Report in local MS Excel using protocol method (ms-excel:)
 */
export function openDeviationInMSExcel(data?: Partial<DeviationItem>): void {
  try {
    const wb = generateDeviationExcelWorkbook(data);
    const fileName = `Sakthi_Auto_Deviation_Report_${(data?.dev_code || "QF_08_CQA_55").replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;

    // 1. Download file locally so user has immediate offline access
    XLSX.writeFile(wb, fileName);

    // 2. Launch Desktop MS Excel via MS Excel protocol scheme
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      // Protocol URI for local Microsoft Excel
      const excelProtocolUri = "ms-excel:ofv|u|" + origin + "/Deviation_Report_Template.xlsx";
      window.location.href = excelProtocolUri;
    }

    toast.success("Opening 2-Page Deviation Report in local MS Excel Desktop App!", {
      description: "Format 1 (Deviation Report QF/08/CQA-55) & Format 2 (RCA, CAPA & Quarantine) launched via ms-excel protocol.",
      duration: 5000,
    });
  } catch (err) {
    console.error("Error opening MS Excel:", err);
    toast.error("Failed to launch Microsoft Excel protocol.");
  }
}
