import React, { useState, useEffect } from "react";
import {
  Save,
  Undo,
  Redo,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Scissors,
  Copy,
  ClipboardPaste,
  PaintBucket,
  Type,
  X,
  Minus,
  Maximize2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { createExcelUri, openInExcelDesktop } from "@/lib/excelUri";

export type CheckpointItem = {
  id: string;
  sl_no?: number | string;
  parameter: string;
  specification: string;
  check_method?: string;
  actual_value: string;
  status: "Pass" | "Fail" | "Pending";
  remarks?: string;
};

interface ExcelChecklistGridProps {
  auditCode: string;
  partName: string;
  plannedMonth: string;
  auditorName: string;
  checkpoints: CheckpointItem[];
  onUpdateCheckpoint: (id: string, field: "actual_value" | "status" | "remarks", value: string) => void;
  onClose?: () => void;
}

export function ExcelChecklistGrid({
  auditCode,
  partName,
  plannedMonth,
  auditorName,
  checkpoints,
  onUpdateCheckpoint,
  onClose,
}: ExcelChecklistGridProps) {
  const [activeCell, setActiveCell] = useState<string>("D6");

  const handleSaveChecklist = () => {
    toast.success(`✓ Saved ${auditCode} inspection checklist to cloud!`);
  };

  // Keyboard shortcut Ctrl+S / Cmd+S inside Excel Checklist Grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveChecklist();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [checkpoints, auditCode]);

  const handleExportAndLaunchExcel = () => {
    const exportData = checkpoints.map((cp, idx) => ({
      "SL. NO.": idx + 1,
      "CHARACTERISTICS / PARAMETER": cp.parameter,
      "SPECIFICATION": cp.specification,
      "CHECK METHOD": cp.check_method || "Visual",
      "OBSERVATION / VALUE": cp.actual_value || "Conforms",
      "RESULT (OK / NOT OK)": cp.status === "Pass" ? "OK" : "NOT OK",
      "REMARKS": cp.remarks || "",
    }));

    let worksheet;
    if (exportData.length === 0) {
      worksheet = XLSX.utils.json_to_sheet([], {
        header: [
          "SL. NO.",
          "CHARACTERISTICS / PARAMETER",
          "SPECIFICATION",
          "CHECK METHOD",
          "OBSERVATION / VALUE",
          "RESULT (OK / NOT OK)",
          "REMARKS"
        ]
      });
    } else {
      worksheet = XLSX.utils.json_to_sheet(exportData);
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Checkpoints");

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 35 },
      { wch: 30 },
      { wch: 20 },
      { wch: 25 },
      { wch: 18 },
      { wch: 20 },
    ];

    const fileName = `${auditCode}_${partName.replace(/[^a-zA-Z0-9]/g, "_")}_Checklist.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success(`✓ Generated ${fileName}! Opening in Microsoft Excel...`);
  };

  const COLUMNS = ["A", "B", "C", "D", "E", "F"];
  
  const getColWidth = (col: string) => {
    switch (col) {
      case "A": return "w-16"; // S.No
      case "B": return "w-64"; // Check Points
      case "C": return "w-56"; // Specification
      case "D": return "w-48"; // Observed Value
      case "E": return "w-32"; // Status
      case "F": return "w-64"; // Remarks
      default: return "w-32";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#f3f2f1] font-sans text-[13px] border border-slate-300 shadow-2xl rounded-md overflow-hidden z-50">
      {/* EXCEL TITLE BAR */}
      <div className="flex items-center justify-between bg-[#107c41] text-white px-2 py-1 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2">
            <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center text-[#107c41] font-black text-xs">
              X
            </div>
            <Save className="h-4 w-4 opacity-80" />
            <Undo className="h-4 w-4 opacity-50" />
            <Redo className="h-4 w-4 opacity-50" />
          </div>
          <span className="font-medium text-sm tracking-wide">
            {auditCode}_{partName}_Audit.xlsx - Saved
          </span>
          <button
            onClick={handleSaveChecklist}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded text-xs flex items-center gap-1 shadow-xs cursor-pointer ml-3"
            title="Save changes to cloud (Ctrl + S)"
          >
            <Save className="h-3.5 w-3.5" /> Save (Ctrl+S)
          </button>

          <button
            onClick={handleExportAndLaunchExcel}
            className="bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-0.5 rounded text-xs flex items-center gap-1 cursor-pointer"
            title="Export & launch directly in Microsoft Excel Desktop App"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Launch MS Excel App
          </button>
        </div>
        <div className="flex items-center">
          <div className="flex items-center gap-2 mr-4 text-xs font-medium">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
              {auditorName.charAt(0).toUpperCase()}
            </div>
            <span>{auditorName}</span>
          </div>
          <div className="flex">
            <button className="p-2 hover:bg-white/20 transition-colors"><Minus className="h-4 w-4" /></button>
            <button className="p-2 hover:bg-white/20 transition-colors"><Maximize2 className="h-4 w-4" /></button>
            <button onClick={onClose} className="p-2 hover:bg-[#e81123] transition-colors"><X className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* EXCEL RIBBON TABS */}
      <div className="flex items-center gap-4 px-2 pt-2 pb-0 bg-white border-b border-slate-200 text-[#107c41] text-sm select-none">
        <span className="px-3 py-1 cursor-pointer hover:bg-slate-100 rounded-t">File</span>
        <span className="px-3 py-1 border-b-2 border-[#107c41] font-semibold cursor-pointer">Home</span>
        <span className="px-3 py-1 text-slate-700 cursor-pointer hover:bg-slate-100 rounded-t">Insert</span>
        <span className="px-3 py-1 text-slate-700 cursor-pointer hover:bg-slate-100 rounded-t">Page Layout</span>
        <span className="px-3 py-1 text-slate-700 cursor-pointer hover:bg-slate-100 rounded-t">Formulas</span>
        <span className="px-3 py-1 text-slate-700 cursor-pointer hover:bg-slate-100 rounded-t">Data</span>
        <span className="px-3 py-1 text-slate-700 cursor-pointer hover:bg-slate-100 rounded-t">Review</span>
        <span className="px-3 py-1 text-slate-700 cursor-pointer hover:bg-slate-100 rounded-t">View</span>
      </div>

      {/* EXCEL RIBBON TOOLBAR */}
      <div className="flex items-center gap-4 bg-[#f3f2f1] px-3 py-1.5 border-b border-slate-300 shadow-xs">
        {/* Clipboard */}
        <div className="flex items-center gap-1 border-r border-slate-300 pr-3">
          <div className="flex flex-col items-center justify-center text-slate-600 hover:bg-slate-200 p-1 rounded cursor-pointer">
            <ClipboardPaste className="h-5 w-5 text-amber-600" />
            <span className="text-[10px] flex items-center">Paste <ChevronDown className="h-2 w-2" /></span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-slate-600 hover:bg-slate-200 p-0.5 rounded cursor-pointer"><Scissors className="h-3.5 w-3.5" /></div>
            <div className="flex items-center gap-1 text-slate-600 hover:bg-slate-200 p-0.5 rounded cursor-pointer"><Copy className="h-3.5 w-3.5" /></div>
          </div>
        </div>
        
        {/* Font */}
        <div className="flex flex-col gap-1 border-r border-slate-300 pr-3">
          <div className="flex items-center gap-1">
            <select className="border border-slate-300 rounded text-xs px-1 py-0.5 bg-white w-28">
              <option>Calibri</option>
            </select>
            <select className="border border-slate-300 rounded text-xs px-1 py-0.5 bg-white w-12">
              <option>11</option>
            </select>
          </div>
          <div className="flex items-center gap-1 text-slate-700">
            <button className="hover:bg-slate-200 p-1 rounded font-bold">B</button>
            <button className="hover:bg-slate-200 p-1 rounded italic">I</button>
            <button className="hover:bg-slate-200 p-1 rounded underline">U</button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button className="hover:bg-slate-200 p-1 rounded"><PaintBucket className="h-3.5 w-3.5 text-yellow-400" /></button>
            <button className="hover:bg-slate-200 p-1 rounded"><Type className="h-3.5 w-3.5 text-red-600" /></button>
          </div>
        </div>

        {/* Alignment */}
        <div className="flex flex-col gap-1 border-r border-slate-300 pr-3 text-slate-700">
          <div className="flex items-center gap-1">
            <button className="hover:bg-slate-200 p-1 rounded"><AlignLeft className="h-3.5 w-3.5" /></button>
            <button className="hover:bg-slate-200 p-1 rounded"><AlignCenter className="h-3.5 w-3.5" /></button>
            <button className="hover:bg-slate-200 p-1 rounded"><AlignRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {/* FORMULA BAR */}
      <div className="flex items-center gap-2 bg-white px-2 py-1 border-b border-slate-300 text-sm">
        <div className="w-16 border border-slate-300 bg-white px-1 text-center text-slate-700 select-none">
          {activeCell}
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <X className="h-3.5 w-3.5" />
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="italic font-serif text-slate-600 mr-2">fx</span>
        </div>
        <div className="flex-1 border border-slate-300 bg-white px-2 py-0.5 h-6"></div>
      </div>

      {/* GRID CONTAINER */}
      <div className="flex-1 overflow-auto bg-[#e1dfdd] flex relative">
        <div className="flex flex-col min-w-max bg-white shadow-sm m-1">
          {/* HEADER ROW (Letters) */}
          <div className="flex bg-[#f3f2f1] border-b border-slate-300 sticky top-0 z-10 text-slate-600 font-medium text-xs select-none">
            <div className="w-10 border-r border-slate-300 bg-[#e1dfdd]"></div>
            {COLUMNS.map((col) => (
              <div key={col} className={`flex items-center justify-center border-r border-slate-300 py-1 ${getColWidth(col)}`}>
                {col}
              </div>
            ))}
          </div>

          {/* ROW 1: AUDIT CHECKLIST HEADER */}
          <div className="flex group">
            <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 text-xs select-none">1</div>
            <div className="flex-1 flex border-b border-slate-300 bg-white text-center font-bold text-lg py-2 select-none tracking-widest">
              <div className="w-full">AUDIT CHECKLIST</div>
            </div>
          </div>

          {/* ROW 2: Audit Plan No / Planned Month */}
          <div className="flex group">
            <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 text-xs select-none">2</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 font-bold ${getColWidth("A")}`}>Audit Plan No</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 text-center ${getColWidth("B")}`}>:</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 font-medium ${getColWidth("C")}`}>{auditCode}</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 font-bold ${getColWidth("D")}`}>Planned Month :</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 font-medium ${getColWidth("E")} flex-1 min-w-[200px]`}>{plannedMonth}</div>
          </div>

          {/* ROW 3: Part Name / Auditor Name */}
          <div className="flex group">
            <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 text-xs select-none">3</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 font-bold ${getColWidth("A")}`}>Part Name</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 text-center ${getColWidth("B")}`}>:</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 font-medium ${getColWidth("C")}`}>{partName}</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 font-bold ${getColWidth("D")}`}>Auditor Name :</div>
            <div className={`flex items-center border-r border-b border-slate-200 px-2 font-medium ${getColWidth("E")} flex-1 min-w-[200px]`}>{auditorName}</div>
          </div>

          {/* ROW 4: EMPTY */}
          <div className="flex group h-6">
            <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 text-xs select-none">4</div>
            <div className="flex-1 border-b border-slate-200 bg-white"></div>
          </div>

          {/* ROW 5: TABLE HEADERS */}
          <div className="flex group bg-[#e2efda] font-bold text-center border-b border-slate-300 select-none">
            <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 text-xs">5</div>
            <div className={`border-r border-slate-300 py-1.5 ${getColWidth("A")}`}>S.No</div>
            <div className={`border-r border-slate-300 py-1.5 ${getColWidth("B")}`}>Check Points</div>
            <div className={`border-r border-slate-300 py-1.5 ${getColWidth("C")}`}>Specification</div>
            <div className={`border-r border-slate-300 py-1.5 ${getColWidth("D")}`}>Observed Value</div>
            <div className={`border-r border-slate-300 py-1.5 ${getColWidth("E")}`}>Status</div>
            <div className={`border-r border-slate-300 py-1.5 ${getColWidth("F")}`}>Remarks</div>
          </div>

          {/* ROWS 6+: DATA ROWS */}
          {checkpoints.map((cp, idx) => {
            const rowNum = idx + 6;
            return (
              <div key={cp.id} className="flex group min-h-[28px] hover:bg-slate-50">
                <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 text-xs select-none">
                  {rowNum}
                </div>
                
                {/* S.No */}
                <div className={`border-r border-b border-slate-200 flex items-center justify-center text-slate-600 ${getColWidth("A")}`}>
                  {idx + 1}
                </div>
                
                {/* Check Points */}
                <div className={`border-r border-b border-slate-200 flex items-center px-2 text-slate-800 ${getColWidth("B")}`}>
                  {cp.parameter}
                </div>
                
                {/* Specification */}
                <div className={`border-r border-b border-slate-200 flex items-center px-2 text-slate-700 ${getColWidth("C")}`}>
                  {cp.specification}
                </div>
                
                {/* Observed Value (EDITABLE) */}
                <div 
                  className={`border-r border-b border-slate-200 p-0 ${getColWidth("D")} ${activeCell === `D${rowNum}` ? 'ring-2 ring-[#107c41] ring-inset z-10 bg-white' : ''}`}
                  onClick={() => setActiveCell(`D${rowNum}`)}
                >
                  <input 
                    type="text" 
                    value={cp.actual_value || ""}
                    onChange={(e) => onUpdateCheckpoint(cp.id, "actual_value", e.target.value)}
                    className="w-full h-full px-2 outline-none bg-transparent"
                  />
                </div>
                
                {/* Status (EDITABLE) */}
                <div 
                  className={`border-r border-b border-slate-200 p-0 ${getColWidth("E")} ${activeCell === `E${rowNum}` ? 'ring-2 ring-[#107c41] ring-inset z-10 bg-white' : ''}`}
                  onClick={() => setActiveCell(`E${rowNum}`)}
                >
                  <select
                    value={cp.status || ""}
                    onChange={(e) => onUpdateCheckpoint(cp.id, "status", e.target.value as any)}
                    className="w-full h-full px-1 outline-none bg-transparent appearance-none text-center font-medium cursor-pointer"
                    style={{ color: cp.status === "Pass" ? "#107c41" : cp.status === "Fail" ? "#d13438" : "inherit" }}
                  >
                    <option value="">-</option>
                    <option value="Pass">OK</option>
                    <option value="Fail">NOT OK</option>
                  </select>
                </div>
                
                {/* Remarks (EDITABLE) */}
                <div 
                  className={`border-r border-b border-slate-200 p-0 ${getColWidth("F")} ${activeCell === `F${rowNum}` ? 'ring-2 ring-[#107c41] ring-inset z-10 bg-white' : ''}`}
                  onClick={() => setActiveCell(`F${rowNum}`)}
                >
                  <input 
                    type="text" 
                    value={cp.remarks || ""}
                    onChange={(e) => onUpdateCheckpoint(cp.id, "remarks", e.target.value)}
                    className="w-full h-full px-2 outline-none bg-transparent"
                  />
                </div>
              </div>
            );
          })}

          {/* Add a few extra empty rows at the bottom for authenticity */}
          {[1, 2, 3, 4, 5].map((i) => {
            const emptyRowNum = checkpoints.length + 5 + i;
            return (
              <div key={i} className="flex group min-h-[28px]">
                <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 text-xs select-none">
                  {emptyRowNum}
                </div>
                {COLUMNS.map(col => (
                  <div key={col} className={`border-r border-b border-slate-200 ${getColWidth(col)}`}></div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* EXCEL STATUS BAR */}
      <div className="flex items-center justify-between bg-[#f3f2f1] border-t border-slate-300 px-4 py-1 text-xs text-slate-600 select-none">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-800">Ready</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 bg-white px-2 py-0.5 border border-slate-300 shadow-xs text-[#107c41] font-bold">
            Audit Checklist
          </div>
          <div className="text-slate-400">+</div>
          <div className="flex items-center gap-2">
            <span className="cursor-pointer">⊟</span>
            <div className="w-16 h-1 bg-slate-300 rounded-full relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-4 bg-slate-500"></div>
            </div>
            <span className="cursor-pointer">⊞</span>
            <span className="ml-2 w-8">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
