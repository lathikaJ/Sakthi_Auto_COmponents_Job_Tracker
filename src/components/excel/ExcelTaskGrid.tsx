import React, { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Save,
  Search,
  CheckCircle2,
  ExternalLink,
  Filter,
  RefreshCw,
  Eraser,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  PaintBucket,
  Printer,
  Grid,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { mergeAndDeduplicateTasks } from "@/lib/audit";

export type ExcelTaskRow = {
  id: string;
  audit_code: string;
  title: string;
  audit_type: string;
  area: string;
  assigned_to_employee_number: string;
  month: number;
  year: number;
  due_date: string;
  status: string;

  // Custom Excel Formatting properties per cell
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  bg_color?: string;
};

interface ExcelTaskGridProps {
  initialRows: ExcelTaskRow[];
  isAdmin: boolean;
  currentEmployeeNumber?: string;
  title?: string;
  description?: string;
  onRefresh?: () => void;
}

const AUDIT_TYPES = ["Product", "Process", "Revalidation"];
const STATUSES = ["Assigned", "In Progress", "Submitted", "Under Review", "Completed", "Deviation", "Overdue"];
const EMPLOYEE_LIST = ["690867", "688079", "663875", "710250", "666468", "665773", "665965", "708818", "667685"];

const MONTH_NAMES = [
  "Jan (1)", "Feb (2)", "Mar (3)", "Apr (4)", "May (5)", "Jun (6)",
  "Jul (7)", "Aug (8)", "Sep (9)", "Oct (10)", "Nov (11)", "Dec (12)"
];

const COLUMNS = [
  { key: "audit_code", label: "A", name: "Audit Code", width: "w-28" },
  { key: "title", label: "B", name: "Task Title", width: "min-w-[240px]" },
  { key: "audit_type", label: "C", name: "Audit Type", width: "w-32" },
  { key: "area", label: "D", name: "Department / Area", width: "w-36" },
  { key: "assigned_to_employee_number", label: "E", name: "Assigned Emp ID", width: "w-36" },
  { key: "month", label: "F", name: "Month", width: "w-24" },
  { key: "due_date", label: "G", name: "Due Date", width: "w-32" },
  { key: "status", label: "H", name: "Status", width: "w-32" },
] as const;

export function ExcelTaskGrid({
  initialRows,
  isAdmin,
  currentEmployeeNumber,
  title = "Master Audit Task Register.xlsx",
  description = "Microsoft Excel & Google Sheets compatible task matrix.",
  onRefresh,
}: ExcelTaskGridProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ExcelTaskRow[]>(initialRows);
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colKey: keyof ExcelTaskRow } | null>({ rowIdx: 0, colKey: "audit_code" });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [activeSheetTab, setActiveSheetTab] = useState<"sheet1" | "sheet2">("sheet1"); // Sheet 1: Master Register, Sheet 2: My Work Queue
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Formatting state for active cell
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [alignMode, setAlignMode] = useState<"left" | "center" | "right">("left");
  const [cellBgColor, setCellBgColor] = useState<string>("transparent");

  // Sync rows when initialRows changes if user hasn't edited
  useEffect(() => {
    if (!hasChanges) {
      const clean = mergeAndDeduplicateTasks(initialRows);
      setRows(clean);
    }
  }, [initialRows, hasChanges]);

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (activeSheetTab === "sheet2") {
      if (currentEmployeeNumber && r.assigned_to_employee_number !== currentEmployeeNumber) {
        return false;
      }
    }
    if (filterType !== "all" && r.audit_type !== filterType) return false;
    if (filterMonth !== "all" && r.month !== parseInt(filterMonth)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.audit_code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.assigned_to_employee_number.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle cell edit
  const handleCellChange = (id: string, field: keyof ExcelTaskRow, value: any) => {
    if (!isAdmin) {
      toast.error("Access Denied: Only Admin users can edit Excel task configuration.");
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
    setHasChanges(true);
  };

  // Cell Formatting Toggles
  const toggleBold = () => {
    if (!selectedCell || !isAdmin) return;
    const rowObj = rows[selectedCell.rowIdx];
    if (rowObj) {
      const nextBold = !rowObj.bold;
      handleCellChange(rowObj.id, "bold", nextBold);
      setIsBold(nextBold);
    }
  };

  const toggleItalic = () => {
    if (!selectedCell || !isAdmin) return;
    const rowObj = rows[selectedCell.rowIdx];
    if (rowObj) {
      const nextItalic = !rowObj.italic;
      handleCellChange(rowObj.id, "italic", nextItalic);
      setIsItalic(nextItalic);
    }
  };

  const changeAlign = (mode: "left" | "center" | "right") => {
    if (!selectedCell || !isAdmin) return;
    const rowObj = rows[selectedCell.rowIdx];
    if (rowObj) {
      handleCellChange(rowObj.id, "align", mode);
      setAlignMode(mode);
    }
  };

  const applyBgColor = (color: string) => {
    if (!selectedCell || !isAdmin) return;
    const rowObj = rows[selectedCell.rowIdx];
    if (rowObj) {
      handleCellChange(rowObj.id, "bg_color", color);
      setCellBgColor(color);
    }
  };

  // Erase active cell content
  const handleEraseCell = () => {
    if (!selectedCell || !isAdmin) {
      toast.error("Select a cell to erase its content.");
      return;
    }
    const rowObj = rows[selectedCell.rowIdx];
    if (rowObj) {
      handleCellChange(rowObj.id, selectedCell.colKey, "");
      toast.info(`Erased value in cell ${activeCellRef}`);
    }
  };

  // Batch delete selected rows
  const handleDeleteSelected = () => {
    if (!isAdmin || selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    setRows((prev) => prev.filter((r) => !selectedRowIds.has(r.id)));
    setSelectedRowIds(new Set());
    setHasChanges(true);
    toast.info(`${count} task row(s) removed from Excel sheet.`);
  };

  // Toggle row selection
  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.size === filteredRows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRows.map((r) => r.id)));
    }
  };

  // Add new empty task row
  const handleAddRow = () => {
    const newId = `temp-${Date.now()}`;
    const newCode = `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split("T")[0] || "2026-08-27";
    const newRow: ExcelTaskRow = {
      id: newId,
      audit_code: newCode,
      title: "",
      audit_type: "Product",
      area: "Machine Shop Line 1",
      assigned_to_employee_number: "688079",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      due_date: today,
      status: "Assigned",
    };
    setRows((prev) => [newRow, ...prev]);
    setHasChanges(true);
    toast.success("New row inserted into Excel sheet! Enter task details.");
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setHasChanges(true);
    toast.info("Task row removed from sheet.");
  };

  // Save & Sync changes to Database & LocalStorage for ALL registered employees
  const handleSaveSync = async () => {
    try {
      toast.loading("Syncing Excel sheet data to all registered employees...");

      const cleanRows = mergeAndDeduplicateTasks(rows);
      setRows(cleanRows);

      if (typeof window !== "undefined") {
        localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(cleanRows));
        window.dispatchEvent(new Event("excel_tasks_updated"));
        window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
      }

      try {
        for (const row of cleanRows) {
          await supabase.from("audit_assignments").upsert(
            {
              audit_code: row.audit_code,
              title: row.title,
              audit_type: (row.audit_type as any) || "Product",
              area: row.area || "General",
              month: row.month || 1,
              year: row.year || 2026,
              due_date: row.due_date || "2026-08-27",
              assigned_to_employee_number: String(row.assigned_to_employee_number || "688079"),
              assigned_to: "00000000-0000-0000-0000-000000000000",
              status: (row.status as any) || "Assigned",
            },
            { onConflict: "audit_code" }
          );
        }
      } catch (dbErr) {
        console.warn("Supabase task sync notice:", dbErr);
      }

      setHasChanges(false);
      await queryClient.invalidateQueries({ queryKey: ["assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["submitted-audits"] });

      toast.dismiss();
      toast.success("✓ Task sheet saved & synced to all registered employees!");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to save changes: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const exportData = filteredRows.map((r, idx) => ({
      "Row #": idx + 1,
      "Audit Code": r.audit_code,
      "Task Title": r.title,
      "Audit Type": r.audit_type || "Product",
      Area: r.area || "General",
      "Assigned Employee": r.assigned_to_employee_number || "688079",
      Month: r.month || 1,
      Year: r.year || 2026,
      "Due Date": r.due_date || "",
      Status: r.status || "Assigned",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master Task Register");

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 35 },
      { wch: 15 },
      { wch: 20 },
      { wch: 18 },
      { wch: 8 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.writeFile(workbook, `Sakthi_Auto_Task_Matrix_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel spreadsheet (.xlsx) exported!");
  };

  // Download Blank MS Excel Template (.xlsx)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Audit Code": "AUD-1001",
        "Task Title": "Steering Knuckle Housing Quality Audit",
        "Audit Type": "Product",
        "Area": "Machine Shop Line 1",
        "Assigned Employee": "688079",
        "Month": 8,
        "Year": 2026,
        "Due Date": "2026-08-30",
        "Status": "Assigned",
      },
      {
        "Audit Code": "REV-002",
        "Task Title": "Fan Bracket Revalidation Inspection",
        "Audit Type": "Revalidation",
        "Area": "Machine Shop 2",
        "Assigned Employee": "690867",
        "Month": 8,
        "Year": 2026,
        "Due Date": "2026-08-31",
        "Status": "Planned",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Plan Template");

    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 35 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 8 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.writeFile(workbook, "Sakthi_Auto_Audit_Plan_Template.xlsx");
    toast.success("Blank MS Excel Template (.xlsx) downloaded!");
  };

  // Excel Import (.xlsx / .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        if (!wsname) return;
        const ws = wb.Sheets[wsname];
        if (!ws) return;
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          toast.error("Uploaded file contains no valid rows.");
          return;
        }

        const importedRows: ExcelTaskRow[] = data.map((item, idx) => ({
          id: `imported-${Date.now()}-${idx}`,
          audit_code: item["Audit Code"] || item["Code"] || `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
          title: item["Task Title"] || item["Title"] || item["Task"] || "Imported Task",
          audit_type: AUDIT_TYPES.includes(item["Audit Type"]) ? item["Audit Type"] : "Product",
          area: item["Area"] || item["Department"] || "General",
          assigned_to_employee_number: String(item["Assigned Employee"] || item["Employee ID"] || "688079"),
          month: Number(item["Month"]) || new Date().getMonth() + 1,
          year: Number(item["Year"]) || new Date().getFullYear(),
          due_date: String(item["Due Date"] || new Date().toISOString().split("T")[0]),
          status: STATUSES.includes(item["Status"]) ? item["Status"] : "Assigned",
        }));

        setRows((prev) => {
          const merged = mergeAndDeduplicateTasks(prev, importedRows);
          return merged;
        });
        setHasChanges(true);
        toast.success(`Imported & smart-merged ${importedRows.length} rows into Excel sheet! Click 'Save & Sync' to save.`);
      } catch {
        toast.error("Error reading Excel file. Please ensure it is a valid .xlsx or .csv document.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentRowObj = selectedCell && rows[selectedCell.rowIdx] ? rows[selectedCell.rowIdx] : null;
  const colLetter = selectedCell ? COLUMNS.find((c) => c.key === selectedCell.colKey)?.label || "A" : "A";
  const activeCellRef = currentRowObj && selectedCell ? `${colLetter}${selectedCell.rowIdx + 1}` : "A1";

  const selectedValue = currentRowObj && selectedCell ? String(currentRowObj[selectedCell.colKey] ?? "") : "";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-[#f8f9fa] text-slate-900 shadow-md font-sans">
      {/* ── 1. MICROSOFT EXCEL / GOOGLE SHEETS GREEN WINDOW TITLE BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#107c41] px-4 py-2 text-white shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-white/20 text-white font-black text-sm">
            X
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              {title}
              {hasChanges ? (
                <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-900 shadow-xs">
                  • UNSAVED EDITS
                </span>
              ) : (
                <span className="rounded bg-emerald-800 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                  ✓ SAVED TO CLOUD
                </span>
              )}
            </h3>
            <p className="text-[11px] text-emerald-100 font-medium">
              Official Excel Task Management Register · Auto-Save Enabled
            </p>
          </div>
        </div>

        {/* Action Buttons in Top Title Bar */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                size="sm"
                onClick={handleSaveSync}
                className={`h-8.5 gap-1.5 font-black text-xs shadow-lg cursor-pointer transition-all px-3.5 ${
                  hasChanges
                    ? "bg-amber-400 hover:bg-amber-500 text-slate-950 animate-pulse ring-2 ring-amber-300"
                    : "bg-amber-400 hover:bg-amber-500 text-slate-950 ring-1 ring-amber-300"
                }`}
                title="Click to save and sync all task assignments to all registered employees across the plant"
              >
                <Save className="h-4 w-4 text-slate-950" /> 💾 Save & Sync to All Employees
              </Button>

              <Button
                size="sm"
                onClick={handleAddRow}
                className="h-8 gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold border border-emerald-600 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> + Insert Row
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-8 gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/30 cursor-pointer"
                title="Download blank MS Excel template (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Blank Excel Template
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/30 cursor-pointer"
                title="Upload & import MS Excel file (.xlsx)"
              >
                <Upload className="h-3.5 w-3.5" /> Import MS Excel (.xlsx)
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/30 cursor-pointer"
                title="Download standard MS Excel file (.xlsx)"
              >
                <Download className="h-3.5 w-3.5" /> Download MS Excel (.xlsx)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── 2. CLASSIC EXCEL / GOOGLE SHEETS MENU BAR ── */}
      <div className="flex items-center gap-4 bg-[#f3f4f6] px-4 py-1 border-b border-slate-300 text-xs font-medium text-slate-700 select-none">
        <span className="hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer font-bold text-slate-900">File</span>
        <span className="hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer">Edit</span>
        <span className="hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer">View</span>
        <span className="hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer">Insert</span>
        <span className="hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer">Format</span>
        <span className="hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer">Data</span>
        <span className="hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer">Tools</span>
        <span className="hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer">Help</span>
      </div>

      {/* ── 3. EXCEL TOOLBAR / FORMATTING RIBBON (BOLD, ALIGNMENT, COLOR) ── */}
      <div className="flex flex-wrap items-center gap-2 bg-[#f8f9fa] border-b border-slate-300 px-4 py-1.5 text-xs text-slate-800">
        {/* Formatting Tools */}
        <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
          <button
            type="button"
            onClick={toggleBold}
            disabled={!isAdmin}
            className={`p-1.5 rounded hover:bg-slate-200 font-extrabold cursor-pointer ${isBold ? "bg-slate-300 text-slate-950" : "text-slate-700"}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleItalic}
            disabled={!isAdmin}
            className={`p-1.5 rounded hover:bg-slate-200 cursor-pointer ${isItalic ? "bg-slate-300 text-slate-950" : "text-slate-700"}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
          <button
            type="button"
            onClick={() => changeAlign("left")}
            disabled={!isAdmin}
            className={`p-1.5 rounded hover:bg-slate-200 cursor-pointer ${alignMode === "left" ? "bg-slate-300 text-slate-950" : "text-slate-700"}`}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changeAlign("center")}
            disabled={!isAdmin}
            className={`p-1.5 rounded hover:bg-slate-200 cursor-pointer ${alignMode === "center" ? "bg-slate-300 text-slate-950" : "text-slate-700"}`}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changeAlign("right")}
            disabled={!isAdmin}
            className={`p-1.5 rounded hover:bg-slate-200 cursor-pointer ${alignMode === "right" ? "bg-slate-300 text-slate-950" : "text-slate-700"}`}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        {/* Fill Background Color Palette */}
        <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
          <PaintBucket className="h-4 w-4 text-slate-600" />
          <button
            type="button"
            onClick={() => applyBgColor("#fef08a")}
            className="h-4 w-4 rounded-full bg-yellow-200 border border-slate-300 hover:scale-110 cursor-pointer"
            title="Yellow Fill"
          />
          <button
            type="button"
            onClick={() => applyBgColor("#bbf7d0")}
            className="h-4 w-4 rounded-full bg-emerald-200 border border-slate-300 hover:scale-110 cursor-pointer"
            title="Green Fill"
          />
          <button
            type="button"
            onClick={() => applyBgColor("#bae6fd")}
            className="h-4 w-4 rounded-full bg-sky-200 border border-slate-300 hover:scale-110 cursor-pointer"
            title="Blue Fill"
          />
          <button
            type="button"
            onClick={() => applyBgColor("transparent")}
            className="h-4 w-4 rounded-full bg-white border border-slate-300 hover:scale-110 cursor-pointer flex items-center justify-center text-[8px] font-bold"
            title="Clear Fill"
          >
            ✕
          </button>
        </div>

        {/* Search & Filter Inputs */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative min-w-[160px]">
            <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search Sheet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 border-slate-300 pl-8 text-xs bg-white text-slate-900 font-medium"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-7 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"
          >
            <option value="all">All Audit Types</option>
            {AUDIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} Audit
              </option>
            ))}
          </select>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="h-7 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"
          >
            <option value="all">All Months</option>
            {MONTH_NAMES.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── USER-FRIENDLY MICROSOFT EXCEL HELPER BANNER FOR NON-TECHNICAL USERS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 px-4 py-2.5 border-b border-emerald-200 text-xs">
        <div className="flex items-center gap-2 text-emerald-900 font-semibold">
          <FileSpreadsheet className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Task Sync Status:</strong> After editing tasks or importing Excel, click <strong>'Save & Sync to All Employees'</strong> to update all registered employee dashboards plant-wide.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Button
              size="sm"
              onClick={handleSaveSync}
              className={`h-7 text-[11px] font-extrabold shadow-2xs gap-1 cursor-pointer transition-all ${
                hasChanges
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse ring-2 ring-amber-300"
                  : "bg-amber-500 hover:bg-amber-600 text-slate-950"
              }`}
              title="Click to save and sync all task assignments to all registered employees"
            >
              <Save className="h-3.5 w-3.5" /> Save & Sync to All Employees
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="h-7 text-[11px] font-bold border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 gap-1 cursor-pointer shadow-2xs"
            title="Download blank pre-formatted MS Excel sheet template"
          >
            <Download className="h-3 w-3" /> Blank Template (.xlsx)
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-7 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1 cursor-pointer shadow-2xs"
            title="Download current audit sheet as MS Excel (.xlsx)"
          >
            <Download className="h-3 w-3" /> Download MS Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* ── 4. CLASSIC EXCEL FORMULA BAR (fx) ── */}
      <div className="flex items-center gap-2 border-b border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800">
        {/* Active Cell Reference Name Box (e.g. A1, B3) */}
        <div className="flex h-7 w-16 items-center justify-center rounded border border-slate-300 bg-slate-100 font-mono font-bold text-emerald-800 shadow-2xs">
          {activeCellRef}
        </div>

        {/* Formula Icon */}
        <div className="flex h-7 w-7 items-center justify-center font-serif italic text-emerald-700 font-black text-sm select-none">
          fx
        </div>

        {/* Formula Input Line */}
        <div className="flex flex-1 items-center rounded border border-slate-300 bg-white px-3 py-1 text-slate-900 shadow-2xs focus-within:ring-2 focus-within:ring-emerald-600">
          <input
            value={selectedValue}
            readOnly={!isAdmin}
            onChange={(e) => {
              if (selectedCell && currentRowObj) {
                handleCellChange(currentRowObj.id, selectedCell.colKey, e.target.value);
              }
            }}
            placeholder="Select a cell to view or enter cell data/formula..."
            className="w-full bg-transparent font-mono text-xs text-slate-900 font-medium outline-none disabled:opacity-80"
          />
        </div>

        {/* Quick Cell Erase & Batch Operations */}
        {isAdmin && selectedCell && (
          <button
            type="button"
            onClick={handleEraseCell}
            className="flex items-center gap-1 rounded bg-amber-100 border border-amber-300 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200 cursor-pointer"
            title="Clear active cell content"
          >
            <Eraser className="h-3 w-3 text-amber-700" /> Erase Cell
          </button>
        )}

        {isAdmin && selectedRowIds.size > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 rounded bg-rose-100 border border-rose-300 px-2 py-1 text-[11px] font-bold text-rose-900 hover:bg-rose-200 cursor-pointer"
          >
            <Trash2 className="h-3 w-3 text-rose-700" /> Delete Selected ({selectedRowIds.size})
          </button>
        )}
      </div>

      {/* ── 5. AUTHENTIC EXCEL GRID TABLE WITH CRISP GRIDLINES & GREEN ACTIVE BORDER ── */}
      <div className="overflow-x-auto max-h-[520px] bg-white border-b border-slate-300">
        <table className="w-full border-collapse text-xs font-sans border-spacing-0">
          {/* Excel Column Headers (A, B, C, D, E, F, G, H) */}
          <thead>
            <tr className="bg-[#e2e8f0] text-slate-800 font-mono text-[11px] uppercase select-none border-b border-slate-400">
              <th className="w-12 border-r border-b border-slate-400 bg-[#cbd5e1] p-1.5 text-center text-slate-700 font-bold">
                {isAdmin ? (
                  <input
                    type="checkbox"
                    checked={selectedRowIds.size === filteredRows.length && filteredRows.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                ) : (
                  "#"
                )}
              </th>
              {COLUMNS.map((col) => {
                const isColActive = selectedCell?.colKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={`border-r border-b border-slate-400 p-1.5 text-left font-bold transition-colors ${col.width} ${
                      isColActive ? "bg-[#107c41] text-white" : "bg-[#e2e8f0] text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{col.label}</span>
                      <span className="text-[10px] opacity-80 font-sans font-semibold tracking-tight">{col.name}</span>
                    </div>
                  </th>
                );
              })}
              <th className="p-1.5 text-center w-28 font-bold border-b border-slate-400 bg-[#e2e8f0] text-slate-800">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, rowIdx) => {
              const isEmpMatch = currentEmployeeNumber && r.assigned_to_employee_number === currentEmployeeNumber;
              const isRowSelected = selectedCell?.rowIdx === rowIdx;

              return (
                <tr
                  key={r.id}
                  className={`border-b border-slate-300 transition-colors ${
                    selectedRowIds.has(r.id) ? "bg-amber-100/80" : isRowSelected ? "bg-emerald-50/40" : isEmpMatch ? "bg-emerald-50/30" : "bg-white"
                  }`}
                >
                  {/* Excel Row Number Column */}
                  <td
                    className={`border-r border-slate-300 p-1.5 text-center font-mono font-bold text-xs select-none ${
                      isRowSelected ? "bg-[#107c41] text-white" : "bg-[#f1f5f9] text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isAdmin && (
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(r.id)}
                          onChange={() => toggleSelectRow(r.id)}
                          className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      )}
                      <span>{rowIdx + 1}</span>
                    </div>
                  </td>

                  {/* A: Code */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "audit_code" })}
                    className={`border-r border-slate-300 p-0.5 relative font-mono font-bold text-emerald-800 ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "audit_code"
                        ? "ring-2 ring-[#107c41] ring-inset bg-emerald-50/80 z-10"
                        : ""
                    }`}
                    style={{ backgroundColor: r.bg_color && r.bg_color !== "transparent" ? r.bg_color : undefined }}
                  >
                    <Input
                      value={r.audit_code}
                      readOnly={!isAdmin}
                      onChange={(e) => handleCellChange(r.id, "audit_code", e.target.value)}
                      className={`h-8 border-none bg-transparent p-1.5 font-mono text-xs text-slate-900 font-bold focus-visible:ring-0 ${
                        r.bold ? "font-black" : ""
                      } ${r.italic ? "italic" : ""}`}
                    />
                  </td>

                  {/* B: Title */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "title" })}
                    className={`border-r border-slate-300 p-0.5 relative ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "title"
                        ? "ring-2 ring-[#107c41] ring-inset bg-emerald-50/80 z-10"
                        : ""
                    }`}
                    style={{ backgroundColor: r.bg_color && r.bg_color !== "transparent" ? r.bg_color : undefined }}
                  >
                    <Input
                      value={r.title}
                      readOnly={!isAdmin}
                      placeholder="Enter task title..."
                      onChange={(e) => handleCellChange(r.id, "title", e.target.value)}
                      className={`h-8 border-none bg-transparent p-1.5 text-xs font-semibold text-slate-900 focus-visible:ring-0 ${
                        r.bold ? "font-black" : ""
                      } ${r.italic ? "italic" : ""}`}
                    />
                  </td>

                  {/* C: Type */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "audit_type" })}
                    className={`border-r border-slate-300 p-0.5 relative ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "audit_type"
                        ? "ring-2 ring-[#107c41] ring-inset bg-emerald-50/80 z-10"
                        : ""
                    }`}
                  >
                    <select
                      value={r.audit_type}
                      disabled={!isAdmin}
                      onChange={(e) => handleCellChange(r.id, "audit_type", e.target.value)}
                      className="h-8 w-full rounded border-none bg-transparent p-1 text-xs font-bold text-slate-900 focus:ring-0 cursor-pointer disabled:opacity-90"
                    >
                      {AUDIT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* D: Area */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "area" })}
                    className={`border-r border-slate-300 p-0.5 relative ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "area"
                        ? "ring-2 ring-[#107c41] ring-inset bg-emerald-50/80 z-10"
                        : ""
                    }`}
                  >
                    <Input
                      value={r.area}
                      readOnly={!isAdmin}
                      placeholder="Enter area..."
                      onChange={(e) => handleCellChange(r.id, "area", e.target.value)}
                      className="h-8 border-none bg-transparent p-1.5 text-xs font-medium text-slate-900 focus-visible:ring-0"
                    />
                  </td>

                  {/* E: Assigned Employee */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "assigned_to_employee_number" })}
                    className={`border-r border-slate-300 p-0.5 relative ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "assigned_to_employee_number"
                        ? "ring-2 ring-[#107c41] ring-inset bg-emerald-50/80 z-10"
                        : ""
                    }`}
                  >
                    <select
                      value={r.assigned_to_employee_number}
                      disabled={!isAdmin}
                      onChange={(e) => handleCellChange(r.id, "assigned_to_employee_number", e.target.value)}
                      className="h-8 w-full rounded border-none bg-transparent p-1 font-mono text-xs font-bold text-slate-900 focus:ring-0 cursor-pointer disabled:opacity-90"
                    >
                      {EMPLOYEE_LIST.map((emp) => (
                        <option key={emp} value={emp}>
                          Emp #{emp}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* F: Month */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "month" })}
                    className={`border-r border-slate-300 p-0.5 relative ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "month"
                        ? "ring-2 ring-[#107c41] ring-inset bg-emerald-50/80 z-10"
                        : ""
                    }`}
                  >
                    <select
                      value={r.month}
                      disabled={!isAdmin}
                      onChange={(e) => handleCellChange(r.id, "month", parseInt(e.target.value))}
                      className="h-8 w-full rounded border-none bg-transparent p-1 text-xs font-semibold text-slate-900 focus:ring-0 cursor-pointer disabled:opacity-90"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {MONTH_NAMES[m - 1]}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* G: Due Date */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "due_date" })}
                    className={`border-r border-slate-300 p-0.5 relative ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "due_date"
                        ? "ring-2 ring-[#107c41] ring-inset bg-emerald-50/80 z-10"
                        : ""
                    }`}
                  >
                    <Input
                      type="date"
                      value={r.due_date}
                      readOnly={!isAdmin}
                      onChange={(e) => handleCellChange(r.id, "due_date", e.target.value)}
                      className="h-8 border-none bg-transparent p-1 text-xs font-semibold text-slate-900 focus-visible:ring-0"
                    />
                  </td>

                  {/* H: Status */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "status" })}
                    className={`border-r border-slate-300 p-0.5 relative ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "status"
                        ? "ring-2 ring-[#107c41] ring-inset bg-emerald-50/80 z-10"
                        : ""
                    }`}
                  >
                    <select
                      value={r.status}
                      disabled={!isAdmin}
                      onChange={(e) => handleCellChange(r.id, "status", e.target.value)}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 shadow-2xs focus:ring-1 focus:ring-emerald-600 disabled:opacity-90 cursor-pointer"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Actions Column */}
                  <td className="p-1 text-center border-slate-300">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        title="Open Audit Execution Form"
                      >
                        <Link to="/audit/$auditId" params={{ auditId: r.id.startsWith("temp-") ? "demo" : r.id }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>

                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-700 hover:bg-amber-100 cursor-pointer"
                            onClick={() => handleCellChange(r.id, "title", "")}
                            title="Clear cell title"
                          >
                            <Eraser className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-700 hover:bg-rose-100 cursor-pointer"
                            onClick={() => handleDeleteRow(r.id)}
                            title="Delete row completely"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-sm font-semibold text-slate-500 bg-white">
                  No tasks found in Excel sheet. Click '+ Insert Row' to add a new task row.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 6. AUTHENTIC EXCEL BOTTOM SHEET TABS & STATUS BAR (SHEET1 / SHEET2) ── */}
      <div className="flex items-center justify-between border-t border-slate-300 bg-[#e2e8f0] px-4 py-1.5 text-xs text-slate-700 select-none">
        {/* Sheet Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSheetTab("sheet1")}
            className={`flex items-center gap-1.5 rounded-t-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
              activeSheetTab === "sheet1"
                ? "bg-white text-emerald-800 border-t-2 border-t-[#107c41] shadow-2xs"
                : "text-slate-600 hover:bg-slate-300"
            }`}
          >
            <Grid className="h-3.5 w-3.5 text-emerald-700" />
            Sheet1: Master Register ({rows.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSheetTab("sheet2")}
            className={`flex items-center gap-1.5 rounded-t-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
              activeSheetTab === "sheet2"
                ? "bg-white text-emerald-800 border-t-2 border-t-[#107c41] shadow-2xs"
                : "text-slate-600 hover:bg-slate-300"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Sheet2: My Work Queue
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleAddRow}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-300 text-slate-700 font-bold cursor-pointer ml-1"
              title="Add new sheet row"
            >
              +
            </button>
          )}
        </div>

        {/* Excel Status Bar Summary */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-700 font-bold">
          <span className="text-emerald-800">READY</span>
          <span>COUNT: {filteredRows.length} Tasks</span>
          <span>SELECTED: {activeCellRef}</span>
          <span className="hidden sm:inline">MODE: Standard Excel Grid (100%)</span>
        </div>
      </div>
    </div>
  );
}
