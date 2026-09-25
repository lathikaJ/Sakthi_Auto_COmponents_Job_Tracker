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
 * Resolves exact observation items for a deviation report.
 * Checks direct data observations, looks up stored deviation by code/id, or generates document-specific rows.
 */
export function resolveDeviationObservations(data?: Partial<DeviationItem> & { title?: string; location?: string; part_no?: string; product_part_number?: string }): DeviationObservationItem[] {
  // 1. Direct observations array on input payload
  if (data?.observations && Array.isArray(data.observations) && data.observations.length > 0) {
    return data.observations;
  }

  // 2. Lookup matching deviation in localStorage
  if (typeof window !== "undefined") {
    const searchCode = (data?.dev_code || data?.audit_id || (data as any)?.audit_code || "").trim().toUpperCase();
    if (searchCode) {
      try {
        const raw = localStorage.getItem("sakthi_deviations");
        if (raw) {
          const devs: DeviationItem[] = JSON.parse(raw);
          const match = devs.find((d) => 
            (d.dev_code && d.dev_code.toUpperCase() === searchCode) ||
            (d.audit_id && d.audit_id.toUpperCase() === searchCode) ||
            (d.id && d.id.toUpperCase() === searchCode)
          );
          if (match && match.observations && match.observations.length > 0) {
            return match.observations;
          }
        }
      } catch {}
    }
  }

  // 3. Dynamic observations generated specifically for THIS document & part
  const partName = data?.part_name || "AUDIT COMPONENT";
  const partNo = data?.part_number || data?.part_no || data?.product_part_number || "SPECIFICATION";
  const devTitle = data?.description || data?.title || "Non-conformance identified during process audit";
  const obsCond = data?.observed_condition || devTitle;

  return [
    {
      sl_no: 1,
      specification: `${partName} (${partNo}) — Critical Dimension & Bore Tolerance`,
      obs1: "NG",
      obs2: "NG",
      obs3: "OK",
      obs4: "OK",
      obs5: "NG",
      obs6: "OK",
      remarks: obsCond,
    },
    {
      sl_no: 2,
      specification: `${partName} — Surface Flatness & Mounting Alignment (< 0.05mm)`,
      obs1: "0.04",
      obs2: "0.05",
      obs3: "0.05",
      obs4: "0.04",
      obs5: "0.06",
      obs6: "0.05",
      remarks: "Sample out of tolerance limit",
    },
    {
      sl_no: 3,
      specification: `${partName} — Machining Pitch & Hole Center Line (120.0 ± 0.1mm)`,
      obs1: "120.05",
      obs2: "120.08",
      obs3: "120.02",
      obs4: "120.06",
      obs5: "120.04",
      obs6: "120.07",
      remarks: "Within specified drawing limits",
    },
  ];
}

/**
 * Generates the official 2-Page Sakthi Auto Deviation Report Workbook
 * Sheet 1: Page 1 - Deviation Report (QF/08/CQA-55)
 * Sheet 2: Page 2 - RCA, CAPA & Quarantine Details
 */
export function generateDeviationExcelWorkbook(data?: Partial<DeviationItem> & { title?: string; location?: string; part_no?: string; product_part_number?: string }): XLSX.WorkBook {
  let todayStr = "10.09.2026";
  try {
    todayStr = format(new Date(), "dd.MM.yyyy");
  } catch (_) {}

  const reportDate = data?.report_date || data?.created_at || todayStr;
  const fromDept = data?.from_dept || "QUALITY ASSURANCE / LINE 1";
  const toDept = data?.to_dept || "PRODUCTION & MANUFACTURING";
  const partName = data?.part_name || "STEERING KNUCKLE";
  const partNumber = data?.part_number || data?.part_no || data?.product_part_number || "45110-M86R00";
  const stage = data?.stage || "INPROCESS";
  const devTitle = data?.description || data?.title || "Steering Knuckle Bore Oversize Non-Conformance";
  const cc = data?.cc || "PLANT HEAD, QA MANAGER, PRODUCTION INCHARGE";
  const docCode = data?.doc_code || "QF/08/CQA-55";
  const docDate = data?.doc_date || "25.12.2015";
  const inspectedBy = data?.inspected_by || data?.segregated_by || "SILAMBARASAN S (688079)";
  const approvedBy = data?.approved_by || "KARTHIKEYAN C (690867)";

  const observations = resolveDeviationObservations(data);

  const capaItems = (data?.capa_items && data.capa_items.length > 0)
    ? data.capa_items
    : [
        {
          date: reportDate,
          part_name: partName,
          part_no: partNumber,
          non_conformance: data?.observed_condition || data?.description || devTitle || "Bore Oversize (+0.01 ~ 0.02mm) observed in sample #5 & #6",
          root_cause: data?.root_cause || (data as any)?.page2_root_cause || "Insert tip wear out during long run machining & coolant jet misaligned",
          corrective_action: data?.corrective_action || (data as any)?.page2_corrective_action || "Replaced tool insert, realigned coolant jet nozzle, and 100% re-inspected lot.",
        }
      ];

  const segQty = data?.quarantine_segregated_qty || data?.segregated_qty || "100";
  const okQty = data?.quarantine_ok_qty || data?.ok_qty || "95";
  const notOkQty = data?.quarantine_not_ok_qty || data?.ng_qty || "5";
  const segBy = data?.quarantine_segregated_by || data?.segregated_by || inspectedBy;
  const quarantineApprovedBy = data?.quarantine_approved_by || data?.approved_by || approvedBy;

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
  // SHEET 2: PAGE 2 RCA, CAPA & QUARANTINE DETAILS (IMAGE 2 FORMAT)
  // ---------------------------------------------------------
  const sheet2Data: any[][] = [
    ["SAKTHI AUTO", "", "ROOT CAUSE, CORRECTIVE ACTION (CAPA) & QUARANTINE DETAILS", "", "", "PAGE : 2 OF 2"],
    ["", "", "", "", "", ""],
    ["NON-CONFORMANCE & CORRECTIVE ACTION LOG", "", "", "", "", ""],
    ["Date", "Part Name", "Part No.", "Non Conformance Details", "Root Cause", "Corrective Action"],
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
  sheet2Data.push(["QUARANTINE DETAILS :", "", "", "", "", ""]);
  sheet2Data.push(["SEGGREGATED QTT:", "OK QTT:", "NOT OK QTT:", "", "", ""]);
  sheet2Data.push([segQty + " PCS", okQty + " PCS", notOkQty + " PCS", "", "", ""]);
  sheet2Data.push(["", "", "", "", "", ""]);
  sheet2Data.push(["SEGGREGATED BY", ": " + segBy, "", "APPROVED BY", ": " + quarantineApprovedBy, ""]);

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
 * Downloads the exact official Sakthi Auto QF 08 CQA - 55 DEVIATION FORMAT FOR DIMENSION.xlsx file (Original User Deviation Report)
 */
export function downloadDeviationExcelWorkbook(data?: Partial<DeviationItem> & { title?: string; location?: string; part_no?: string; product_part_number?: string }): void {
  try {
    const wb = generateDeviationExcelWorkbook(data);
    const devCode = data?.dev_code || data?.audit_id || "RECORD";
    const fileName = `QF 08 CQA - 55 DEVIATION FORMAT FOR DIMENSION - ${devCode}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Downloaded Deviation Report!", {
      description: `Saved ${fileName} with Page 1 (QF/08/CQA-55) and Page 2 (RCA & CAPA)`,
    });
  } catch (err) {
    console.error("Download Excel Error:", err);
    toast.error("Failed to download Deviation Excel file.");
  }
}

/**
 * Launches desktop Microsoft Excel directly via ms-excel protocol URI using QF 08 CQA - 55 format.
 */
export function openDeviationInMSExcel(data?: Partial<DeviationItem>): void {
  try {
    if (typeof window !== "undefined") {
      const excelProtocolUri = "ms-excel:ofe|u|" + window.location.origin + "/Deviation_Report_Template.xlsx";
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      iframe.src = excelProtocolUri;

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }

    toast.success("Launching Microsoft Excel Desktop App!", {
      description: "Opened QF 08 CQA - 55 DEVIATION FORMAT FOR DIMENSION.xlsx (Sheet1 & BACK PAGE) in desktop MS Excel.",
      duration: 6000,
    });
  } catch (err) {
    console.error("Error launching MS Excel:", err);
    toast.error("Failed to launch Microsoft Excel protocol.");
  }
}




/**
 * Parses an edited Excel file uploaded by user and extracts observation data & CAPA items
 */
export function parseDeviationExcelFile(file: File): Promise<Partial<DeviationItem>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName1 = wb.SheetNames[0] || "";
        const sheetName2 = wb.SheetNames[1] || sheetName1;
        const sheet1 = wb.Sheets[sheetName1];
        const sheet2 = wb.Sheets[sheetName2];

        const rows1: any[][] = sheet1 ? (XLSX.utils.sheet_to_json(sheet1, { header: 1 }) as any[][]) : [];
        const rows2: any[][] = sheet2 ? (XLSX.utils.sheet_to_json(sheet2, { header: 1 }) as any[][]) : [];

        const observations: DeviationObservationItem[] = [];
        rows1.forEach((r) => {
          if (r && (typeof r[0] === "number" || (!isNaN(Number(r[0])) && Number(r[0]) > 0)) && r[1]) {
            observations.push({
              sl_no: Number(r[0]),
              specification: String(r[1] || ""),
              obs1: String(r[2] || ""),
              obs2: String(r[3] || ""),
              obs3: String(r[4] || ""),
              obs4: String(r[5] || ""),
              obs5: String(r[6] || ""),
              obs6: String(r[7] || ""),
              remarks: String(r[8] || ""),
            });
          }
        });

        const capaItems: DeviationCapaItem[] = [];
        rows2.forEach((r) => {
          if (r && r[0] && r[1] && r[3] && String(r[0]) !== "DATE" && String(r[0]) !== "SAKTHI AUTO") {
            capaItems.push({
              date: String(r[0] || ""),
              part_name: String(r[1] || ""),
              part_no: String(r[2] || ""),
              non_conformance: String(r[3] || ""),
              root_cause: String(r[4] || ""),
              corrective_action: String(r[5] || ""),
            });
          }
        });

        const result: Partial<DeviationItem> = {};
        if (observations.length > 0) result.observations = observations;
        if (capaItems.length > 0) result.capa_items = capaItems;

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
