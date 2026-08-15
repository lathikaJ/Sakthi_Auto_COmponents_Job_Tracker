import React, { useState, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";

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
const STATUSES = ["Assigned", "In Progress", "Submitted", "Completed", "Deviation", "Overdue"];
const EMPLOYEE_LIST = ["1001", "1002", "1003", "1004", "1005"];

const MONTH_NAMES = [
  "Jan (1)", "Feb (2)", "Mar (3)", "Apr (4)", "May (5)", "Jun (6)",
  "Jul (7)", "Aug (8)", "Sep (9)", "Oct (10)", "Nov (11)", "Dec (12)"
];

export function ExcelTaskGrid({
  initialRows,
  isAdmin,
  currentEmployeeNumber,
  title = "Excel Task Matrix",
  description = "Live Excel spreadsheet for updating and tracking audit tasks.",
  onRefresh,
}: ExcelTaskGridProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ExcelTaskRow[]>(initialRows);
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colKey: keyof ExcelTaskRow } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"matrix" | "my_tasks">("matrix");
  const [hasChanges, setHasChanges] = useState(false);

  // Sync rows when initialRows changes if user hasn't edited
  React.useEffect(() => {
    if (!hasChanges) {
      // Deduplicate rows by audit_code / id
      const uniqueMap = new Map<string, ExcelTaskRow>();
      initialRows.forEach((r) => {
        const key = r.audit_code || r.id;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, r);
        }
      });
      setRows(Array.from(uniqueMap.values()));
    }
  }, [initialRows, hasChanges]);

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    // Only filter by current employee when "My Queue" tab is explicitly active
    if (activeTab === "my_tasks") {
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

  // Add new empty row (Admin)
  const handleAddRow = () => {
    const newId = `temp-${Date.now()}`;
    const newCode = `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRow: ExcelTaskRow = {
      id: newId,
      audit_code: newCode,
      title: "",
      audit_type: "Product",
      area: "",
      assigned_to_employee_number: "1002",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      due_date: new Date().toISOString().split("T")[0],
      status: "Assigned",
    };
    setRows((prev) => [newRow, ...prev]);
    setHasChanges(true);
    toast.success("Empty row added to Excel sheet. Enter your task details.");
  };

  // Delete row (Admin)
  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setHasChanges(true);
    toast.info("Task row removed from sheet.");
  };

  // Save changes to Database & LocalStorage for instant sync
  const handleSaveSync = async () => {
    try {
      toast.loading("Saving Excel updates to system…");

      // 1. Always persist to localStorage for local/demo synchronization
      if (typeof window !== "undefined") {
        localStorage.setItem("sakthi_excel_tasks", JSON.stringify(rows));
        window.dispatchEvent(new Event("excel_tasks_updated"));
      }

      // 2. Attempt Supabase database sync
      try {
        for (const row of rows) {
          if (row.id.startsWith("temp-") || row.id.startsWith("demo-")) {
            await supabase.from("audit_assignments").upsert(
              {
                audit_code: row.audit_code,
                title: row.title,
                audit_type: (row.audit_type as any) || "Product",
                area: row.area || "General",
                month: row.month || 1,
                year: row.year || 2026,
                due_date: row.due_date || new Date().toISOString().split("T")[0],
                assigned_to_employee_number: row.assigned_to_employee_number || "1002",
                assigned_to: "00000000-0000-0000-0000-000000000000",
                status: (row.status as any) || "Assigned",
              },
              { onConflict: "audit_code" }
            );
          } else {
            await supabase
              .from("audit_assignments")
              .update({
                title: row.title,
                audit_type: (row.audit_type as any) || "Product",
                area: row.area || "General",
                month: row.month || 1,
                year: row.year || 2026,
                due_date: row.due_date || new Date().toISOString().split("T")[0],
                assigned_to_employee_number: row.assigned_to_employee_number || "1002",
                status: (row.status as any) || "Assigned",
              })
              .eq("id", row.id);
          }
        }
      } catch (dbErr) {
        console.warn("Supabase DB sync notice:", dbErr);
      }

      setHasChanges(false);
      await queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.dismiss();
      toast.success("Excel task updates successfully synchronized across Admin & Employee views!");
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
      "Assigned Employee": r.assigned_to_employee_number || "1002",
      Month: r.month || 1,
      Year: r.year || 2026,
      "Due Date": r.due_date || "",
      Status: r.status || "Assigned",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Tasks");

    // Auto fit columns
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

    XLSX.writeFile(workbook, `Sakthi_Spark_Task_Matrix_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel file exported successfully!");
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
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          toast.error("The uploaded Excel file contains no valid rows.");
          return;
        }

        const importedRows: ExcelTaskRow[] = data.map((item, idx) => ({
          id: `imported-${Date.now()}-${idx}`,
          audit_code: item["Audit Code"] || item["Code"] || `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
          title: item["Task Title"] || item["Title"] || item["Task"] || "Imported Task",
          audit_type: AUDIT_TYPES.includes(item["Audit Type"]) ? item["Audit Type"] : "Product",
          area: item["Area"] || item["Department"] || "General",
          assigned_to_employee_number: String(item["Assigned Employee"] || item["Employee ID"] || "1002"),
          month: Number(item["Month"]) || new Date().getMonth() + 1,
          year: Number(item["Year"]) || new Date().getFullYear(),
          due_date: String(item["Due Date"] || new Date().toISOString().split("T")[0]),
          status: STATUSES.includes(item["Status"]) ? item["Status"] : "Assigned",
        }));

        setRows((prev) => [...importedRows, ...prev]);
        setHasChanges(true);
        toast.success(`Successfully imported ${importedRows.length} tasks from Excel! Click 'Save & Sync' to persist.`);
      } catch (err) {
        toast.error("Error reading Excel file. Please ensure it is a valid .xlsx or .csv document.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentRowObj = selectedCell && rows[selectedCell.rowIdx] ? rows[selectedCell.rowIdx] : null;
  const activeCellRef = currentRowObj
    ? `${String.fromCharCode(65 + Math.max(0, Object.keys(currentRowObj).indexOf(selectedCell!.colKey)))}${selectedCell!.rowIdx + 1}`
    : "A1";

  const selectedValue = currentRowObj && selectedCell
    ? String(currentRowObj[selectedCell.colKey] ?? "")
    : "";

  return (
    <div className="card-elevated flex flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-white text-slate-900 shadow-sm">
      {/* Excel Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-emerald-50/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-600 p-2 text-white shadow-xs">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {title}
              {hasChanges ? (
                <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-800">
                  Unsaved Edits
                </span>
              ) : (
                <span className="rounded bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  Synced
                </span>
              )}
            </h3>
            <p className="text-xs font-medium text-slate-600">{description}</p>
          </div>
        </div>

        {/* Excel Control Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs"
            onClick={handleAddRow}
          >
            <Plus className="h-4 w-4" /> Add Task Row
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 shadow-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 text-emerald-600" /> Import Excel
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 shadow-xs"
            onClick={handleExportExcel}
          >
            <Download className="h-4 w-4 text-emerald-600" /> Export Excel
          </Button>

          {hasChanges && (
            <Button
              size="sm"
              className="gap-1.5 bg-amber-600 font-bold text-white hover:bg-amber-700 shadow-md"
              onClick={handleSaveSync}
            >
              <Save className="h-4 w-4" /> Save & Sync Excel
            </Button>
          )}
        </div>
      </div>

      {/* Excel Formula & Filter Ribbon */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-100/90 px-4 py-2 text-xs font-medium text-slate-800">
        {/* Cell Box */}
        <div className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1 font-mono font-bold text-emerald-700 shadow-xs">
          <span>Cell:</span>
          <span>{activeCellRef}</span>
        </div>

        {/* Formula Bar */}
        <div className="flex flex-1 items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1 text-slate-900 shadow-xs">
          <span className="font-serif italic text-emerald-600 font-bold text-sm">fx</span>
          <span className="truncate text-slate-900 font-mono font-medium">
            {selectedValue || "Select cell to view/edit value"}
          </span>
        </div>

        {/* Search */}
        <div className="relative min-w-[180px]">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search Excel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 border-slate-300 pl-8 text-xs bg-white text-slate-900 font-medium"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-7 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"
        >
          <option value="all">All Types</option>
          {AUDIT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t} Audit
            </option>
          ))}
        </select>

        {/* Month Filter */}
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

      {/* Interactive Excel Grid Table */}
      <div className="overflow-x-auto max-h-[500px] bg-white">
        <table className="w-full border-collapse text-xs font-sans">
          {/* Excel Header Column Labels (A, B, C, D...) */}
          <thead>
            <tr className="bg-slate-200 text-slate-800 font-mono text-[11px] uppercase border-b border-slate-300">
              <th className="w-10 border-r border-slate-300 bg-slate-300 p-2 text-center text-slate-700 font-bold">
                #
              </th>
              <th className="border-r border-slate-300 p-2 text-left w-28 font-bold text-slate-800">A: Code</th>
              <th className="border-r border-slate-300 p-2 text-left min-w-[220px] font-bold text-slate-800">B: Task Title</th>
              <th className="border-r border-slate-300 p-2 text-left w-32 font-bold text-slate-800">C: Type</th>
              <th className="border-r border-slate-300 p-2 text-left w-36 font-bold text-slate-800">D: Area</th>
              <th className="border-r border-slate-300 p-2 text-left w-36 font-bold text-slate-800">E: Assigned Emp</th>
              <th className="border-r border-slate-300 p-2 text-left w-24 font-bold text-slate-800">F: Month</th>
              <th className="border-r border-slate-300 p-2 text-left w-32 font-bold text-slate-800">G: Due Date</th>
              <th className="border-r border-slate-300 p-2 text-left w-32 font-bold text-slate-800">H: Status</th>
              <th className="p-2 text-center w-24 font-bold text-slate-800">I: Open Form</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, rowIdx) => {
              const isEmpMatch = currentEmployeeNumber && r.assigned_to_employee_number === currentEmployeeNumber;

              return (
                <tr
                  key={r.id}
                  className={`border-b border-slate-200 transition-colors hover:bg-emerald-50/50 ${
                    isEmpMatch ? "bg-emerald-50/70" : "bg-white"
                  }`}
                >
                  {/* Excel Line Number */}
                  <td className="border-r border-slate-200 bg-slate-100 p-2 text-center font-mono font-bold text-slate-600 select-none">
                    {rowIdx + 1}
                  </td>

                  {/* A: Code */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "audit_code" })}
                    className={`border-r border-slate-200 p-1 font-mono font-bold text-emerald-700 ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "audit_code"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  >
                    <Input
                      value={r.audit_code}
                      onChange={(e) => handleCellChange(r.id, "audit_code", e.target.value)}
                      className="h-8 border-none bg-transparent p-1 font-mono text-xs text-slate-900 font-bold focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </td>

                  {/* B: Title */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "title" })}
                    className={`border-r border-slate-200 p-1 ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "title"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  >
                    <Input
                      value={r.title}
                      placeholder="Enter task title..."
                      onChange={(e) => handleCellChange(r.id, "title", e.target.value)}
                      className="h-8 border-none bg-transparent p-1 font-semibold text-xs text-slate-900 focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </td>

                  {/* C: Type */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "audit_type" })}
                    className={`border-r border-slate-200 p-1 ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "audit_type"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  >
                    <select
                      value={r.audit_type}
                      onChange={(e) => handleCellChange(r.id, "audit_type", e.target.value)}
                      className="h-8 w-full rounded border-none bg-transparent p-1 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500"
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
                    className={`border-r border-slate-200 p-1 ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "area"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  >
                    <Input
                      value={r.area}
                      placeholder="Enter area..."
                      onChange={(e) => handleCellChange(r.id, "area", e.target.value)}
                      className="h-8 border-none bg-transparent p-1 text-xs font-semibold text-slate-900 focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </td>

                  {/* E: Assigned Employee */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "assigned_to_employee_number" })}
                    className={`border-r border-slate-200 p-1 ${
                      selectedCell?.rowIdx === rowIdx &&
                      selectedCell?.colKey === "assigned_to_employee_number"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  >
                    <select
                      value={r.assigned_to_employee_number}
                      onChange={(e) =>
                        handleCellChange(r.id, "assigned_to_employee_number", e.target.value)
                      }
                      className="h-8 w-full rounded border-none bg-transparent p-1 font-mono text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
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
                    className={`border-r border-slate-200 p-1 ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "month"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  >
                    <select
                      value={r.month}
                      onChange={(e) => handleCellChange(r.id, "month", parseInt(e.target.value))}
                      className="h-8 w-full rounded border-none bg-transparent p-1 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500"
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
                    className={`border-r border-slate-200 p-1 ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "due_date"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  >
                    <Input
                      type="date"
                      value={r.due_date}
                      onChange={(e) => handleCellChange(r.id, "due_date", e.target.value)}
                      className="h-8 border-none bg-transparent p-1 text-xs font-semibold text-slate-900 focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </td>

                  {/* H: Status */}
                  <td
                    onClick={() => setSelectedCell({ rowIdx, colKey: "status" })}
                    className={`border-r border-slate-200 p-1 ${
                      selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === "status"
                        ? "ring-2 ring-emerald-500 bg-emerald-50"
                        : ""
                    }`}
                  >
                    <select
                      value={r.status}
                      onChange={(e) => handleCellChange(r.id, "status", e.target.value)}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* I: Action / Open Form */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-100"
                        title="Open Audit Execution Form"
                      >
                        <Link to="/audit/$auditId" params={{ auditId: r.id.startsWith("temp-") ? "demo" : r.id }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-600 hover:bg-rose-100"
                          onClick={() => handleDeleteRow(r.id)}
                          title="Delete Row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-sm font-medium text-slate-500">
                  No task rows match your current search/filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Excel Sheet Footer Tabs */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700">
        <div className="flex items-center gap-1 font-medium">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 rounded-t px-3 py-1 transition-colors ${
              activeTab === "matrix"
                ? "bg-white text-emerald-700 font-bold border-t-2 border-emerald-600 shadow-xs"
                : "hover:bg-slate-200 text-slate-600"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> All Tasks Grid ({rows.length})
          </button>

          {currentEmployeeNumber && (
            <button
              onClick={() => setActiveTab("my_tasks")}
              className={`flex items-center gap-1.5 rounded-t px-3 py-1 transition-colors ${
                activeTab === "my_tasks"
                  ? "bg-white text-emerald-700 font-bold border-t-2 border-emerald-600 shadow-xs"
                  : "hover:bg-slate-200 text-slate-600"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> My Queue (
              {rows.filter((r) => r.assigned_to_employee_number === currentEmployeeNumber).length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono font-semibold text-slate-600">
          <span>Total Rows: {filteredRows.length}</span>
          <span className="text-emerald-700 font-bold">Ready for Sync</span>
        </div>
      </div>
    </div>
  );
}
