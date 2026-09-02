import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Scissors,
  Copy,
  ClipboardPaste,
  PaintBucket,
  Type,
  X,
  Minus,
  CheckCircle2,
  Download,
  Search,
  Bell,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/useAuth";
import { recordSubmittedAudit } from "@/lib/submittedAudits";
import { openAuditInLocalExcel } from "@/lib/auditExcel";

export interface AuditRecordItem {
  id: string;
  audit_code: string;
  part_name: string;
  planned_month: string;
  auditor_name: string;
  status: "Assigned" | "In Progress" | "Under Review" | "Completed" | "Pending";
  checkpoints: Array<{
    id: string;
    sl_no: number;
    parameter: string;
    specification: string;
    actual_value: string;
    status: "OK" | "NOT OK" | "Pass" | "Fail" | "-";
    remarks: string;
  }>;
}

export const DEFAULT_SAMPLE_AUDITS: AuditRecordItem[] = [
  {
    id: "ap-001",
    audit_code: "AP-001",
    part_name: "Brake Disc",
    planned_month: "May 2025",
    auditor_name: "Yaswanth",
    status: "In Progress",
    checkpoints: [
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
        remarks: "-",
      },
    ],
  },
  {
    id: "ap-002",
    audit_code: "AP-002",
    part_name: "Clutch Plate",
    planned_month: "May 2025",
    auditor_name: "Yaswanth",
    status: "In Progress",
    checkpoints: [
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
    ],
  },
  {
    id: "ap-003",
    audit_code: "AP-003",
    part_name: "Gear Shaft",
    planned_month: "June 2025",
    auditor_name: "Karthik R",
    status: "Pending",
    checkpoints: [
      {
        id: "cp-1",
        sl_no: 1,
        parameter: "Shaft Runout & Concentricity",
        specification: "≤ 0.015 mm TIR",
        actual_value: "0.010 mm",
        status: "OK",
        remarks: "Within tolerance",
      },
      {
        id: "cp-2",
        sl_no: 2,
        parameter: "Tooth Profile & Pitch",
        specification: "DIN 7 / ISO 1328",
        actual_value: "Conforms",
        status: "OK",
        remarks: "CMM checked",
      },
      {
        id: "cp-3",
        sl_no: 3,
        parameter: "Core Hardness",
        specification: "28-34 HRC",
        actual_value: "31 HRC",
        status: "OK",
        remarks: "-",
      },
      {
        id: "cp-4",
        sl_no: 4,
        parameter: "MPI Crack Inspection",
        specification: "Zero Flaws / No Cracks",
        actual_value: "Pass",
        status: "OK",
        remarks: "Fluorescent UV clear",
      },
    ],
  },
  {
    id: "ap-004",
    audit_code: "AP-004",
    part_name: "Engine Cover",
    planned_month: "June 2025",
    auditor_name: "Suresh M",
    status: "Assigned",
    checkpoints: [
      {
        id: "cp-1",
        sl_no: 1,
        parameter: "Mounting Face Flatness",
        specification: "≤ 0.08 mm",
        actual_value: "0.05 mm",
        status: "OK",
        remarks: "Surface plate test",
      },
      {
        id: "cp-2",
        sl_no: 2,
        parameter: "Thread Depth & Go/No-Go",
        specification: "M8x1.25 - 6H (18 mm depth)",
        actual_value: "Go Passed / No-Go Stoppage",
        status: "OK",
        remarks: "All 12 holes OK",
      },
      {
        id: "cp-3",
        sl_no: 3,
        parameter: "Pressure Leakage Test",
        specification: "No leak @ 3.5 bar (Air)",
        actual_value: "0.00 bar drop",
        status: "OK",
        remarks: "Water immersion verified",
      },
      {
        id: "cp-4",
        sl_no: 4,
        parameter: "Anodizing / Paint Layer",
        specification: "40-60 µm",
        actual_value: "52 µm",
        status: "OK",
        remarks: "Uniform coat",
      },
    ],
  },
];

interface TouchExcelWorkstationProps {
  initialAudits?: AuditRecordItem[];
  onSelectAudit?: (audit: AuditRecordItem) => void;
  className?: string;
}

export function TouchExcelWorkstation({
  initialAudits,
  onSelectAudit,
  className = "",
}: TouchExcelWorkstationProps) {
  const { profile } = useAuth();
  const currentAuditorName = profile?.full_name || "Yaswanth";

  // Persistent storage key
  const STORAGE_KEY = "sakthi_touch_excel_audits_v1";

  const [audits, setAudits] = useState<AuditRecordItem[]>(() => {
    if (initialAudits && initialAudits.length > 0) return initialAudits;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_SAMPLE_AUDITS;
  });

  // Selected audit for the right-hand Excel editor
  const [selectedAuditId, setSelectedAuditId] = useState<string>("ap-002");
  const [activeTabFilter, setActiveTabFilter] = useState<"All" | "My Audit" | "Pending">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Excel Editor State
  const [activeCell, setActiveCell] = useState<string>("D6");
  const [activeFormulaText, setActiveFormulaText] = useState<string>("OK");
  const [isSaving, setIsSaving] = useState(false);

  // Format styles in Excel toolbar
  const [fontBold, setFontBold] = useState(false);
  const [fontItalic, setFontItalic] = useState(false);
  const [fontUnderline, setFontUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const selectedAudit: AuditRecordItem = useMemo(() => {
    const found = audits.find((a) => a.id === selectedAuditId);
    return found || audits[0] || DEFAULT_SAMPLE_AUDITS[0]!;
  }, [audits, selectedAuditId]);

  // Persist audits whenever updated
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
    }
  }, [audits]);

  // Filter left list
  const filteredAudits = useMemo(() => {
    return audits.filter((item) => {
      // Filter tab
      if (activeTabFilter === "My Audit") {
        const isMine =
          item.auditor_name.toLowerCase().includes(currentAuditorName.toLowerCase()) ||
          item.auditor_name.toLowerCase().includes("yaswanth");
        if (!isMine) return false;
      } else if (activeTabFilter === "Pending") {
        if (item.status === "Completed") return false;
      }

      // Search query
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.audit_code.toLowerCase().includes(q) ||
        item.part_name.toLowerCase().includes(q) ||
        item.planned_month.toLowerCase().includes(q) ||
        item.auditor_name.toLowerCase().includes(q)
      );
    });
  }, [audits, activeTabFilter, searchQuery, currentAuditorName]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const allCount = audits.length;
    const myCount = audits.filter(
      (a) =>
        a.auditor_name.toLowerCase().includes(currentAuditorName.toLowerCase()) ||
        a.auditor_name.toLowerCase().includes("yaswanth")
    ).length;
    const pendingCount = audits.filter((a) => a.status !== "Completed").length;
    return { allCount, myCount, pendingCount };
  }, [audits, currentAuditorName]);

  // Handle cell updates in active audit
  const handleUpdateCheckpoint = (
    checkpointId: string,
    field: "parameter" | "specification" | "actual_value" | "status" | "remarks",
    value: string
  ) => {
    setAudits((prev) =>
      prev.map((audit) => {
        if (audit.id !== selectedAudit.id) return audit;
        return {
          ...audit,
          checkpoints: audit.checkpoints.map((cp) => {
            if (cp.id !== checkpointId) return cp;
            return {
              ...cp,
              [field]: value,
            };
          }),
        };
      })
    );

    if (field === "actual_value") {
      setActiveFormulaText(value);
    }
  };

  // Direct formula bar edit
  const handleFormulaBarChange = (val: string) => {
    setActiveFormulaText(val);
    const match = activeCell.match(/([A-Z])(\d+)/);
    if (match && match[1] && match[2]) {
      const col = match[1];
      const rowNum = parseInt(match[2], 10);
      const cpIndex = rowNum - 6;
      if (cpIndex >= 0 && cpIndex < selectedAudit.checkpoints.length) {
        const cp = selectedAudit.checkpoints[cpIndex];
        if (cp) {
          if (col === "D") {
            handleUpdateCheckpoint(cp.id, "actual_value", val);
          } else if (col === "B") {
            handleUpdateCheckpoint(cp.id, "parameter", val);
          } else if (col === "C") {
            handleUpdateCheckpoint(cp.id, "specification", val);
          } else if (col === "F") {
            handleUpdateCheckpoint(cp.id, "remarks", val);
          }
        }
      }
    }
  };

  const handleSaveToCloud = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success(`✓ Saved ${selectedAudit.audit_code}_${selectedAudit.part_name}_Audit.xlsx to cloud!`, {
        description: "All checkpoint observations synced immediately.",
      });

      try {
        recordSubmittedAudit({
          audit_code: selectedAudit.audit_code,
          part_no: `${selectedAudit.audit_code}-P`,
          part_name: selectedAudit.part_name,
          employee_name: selectedAudit.auditor_name,
          employee_number: profile?.employee_number || "EMP-1002",
          department: "Quality Assurance",
          submitted_date: new Date().toISOString(),
          formatted_submitted_date: new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          status: "Under Review",
          checkpoints_count: selectedAudit.checkpoints.length,
          failing_count: selectedAudit.checkpoints.filter(
            (c) => c.status === "NOT OK" || c.status === "Fail"
          ).length,
        });
      } catch {}
    }, 400);
  };

  // Keyboard shortcut Ctrl+S / Cmd+S inside Excel Grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveToCloud();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAudit]);

  // Export to standard XLSX
  const handleExportXlsx = () => {
    try {
      const exportData = [
        ["AUDIT CHECKLIST"],
        ["Audit Plan No :", selectedAudit.audit_code, "", "Planned Month :", selectedAudit.planned_month],
        ["Part Name :", selectedAudit.part_name, "", "Auditor Name :", selectedAudit.auditor_name],
        [],
        ["S.No", "Check Points", "Specification", "Observed Value", "Status", "Remarks"],
        ...selectedAudit.checkpoints.map((cp) => [
          cp.sl_no,
          cp.parameter,
          cp.specification,
          cp.actual_value,
          cp.status,
          cp.remarks,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Audit Checklist");
      XLSX.writeFile(wb, `${selectedAudit.audit_code}_${selectedAudit.part_name}_Audit.xlsx`);
      toast.success(`Downloaded ${selectedAudit.audit_code}_${selectedAudit.part_name}_Audit.xlsx`);
    } catch {
      toast.error("Failed to export Excel file.");
    }
  };

  // Add new checkpoint row
  const handleAddCheckpointRow = () => {
    const newNo = selectedAudit.checkpoints.length + 1;
    const newCp = {
      id: `cp-${Date.now()}`,
      sl_no: newNo,
      parameter: "New Inspection Checkpoint",
      specification: "Conforms to drawing",
      actual_value: "OK",
      status: "OK" as const,
      remarks: "-",
    };

    setAudits((prev) =>
      prev.map((audit) => {
        if (audit.id !== selectedAudit.id) return audit;
        return {
          ...audit,
          checkpoints: [...audit.checkpoints, newCp],
        };
      })
    );
    toast.success(`Added Checkpoint #${newNo} to spreadsheet`);
  };

  const COLUMNS = ["A", "B", "C", "D", "E", "F"];
  const getColWidth = (col: string) => {
    switch (col) {
      case "A":
        return "w-14 min-w-[56px]"; // S.No
      case "B":
        return "w-56 min-w-[210px]"; // Check Points
      case "C":
        return "w-52 min-w-[190px]"; // Specification
      case "D":
        return "w-44 min-w-[160px]"; // Observed Value
      case "E":
        return "w-28 min-w-[100px]"; // Status
      case "F":
        return "w-44 min-w-[160px]"; // Remarks
      default:
        return "w-32";
    }
  };

  return (
    <div className={`w-full flex flex-col space-y-4 ${className}`}>
      {/* ── TOP PRESENTATION HEADER ── */}
      <div className="text-center py-2 select-none">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c2340] tracking-tight flex items-center justify-center gap-2">
          Touch Excel File <span className="text-sky-600 font-black">→</span> Work Directly on That File
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Tap the Excel file and start working immediately.
        </p>
      </div>

      {/* ── MAIN WORKSPACE (SIDE-BY-SIDE SPLIT) ── */}
      <div className="bg-[#eef2f6] border border-slate-300/80 rounded-2xl p-3 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ════════ LEFT CONTAINER: ONGOING AUDIT DASHBOARD ════════ */}
          <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden">
            {/* Dark Navy Blue Header */}
            <div className="bg-[#0b1b33] text-white px-4 py-3 flex items-center justify-between select-none">
              <div className="flex items-center gap-2.5 font-bold text-base tracking-wide">
                <span className="text-lg opacity-80">≡</span>
                <span>Ongoing Audit</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1 hover:bg-white/10 rounded-full transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4 text-slate-200" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-[#0b1b33]"></span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-800 placeholder-slate-400 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center border-b border-slate-200 bg-white text-xs font-semibold px-2 select-none">
              <button
                type="button"
                onClick={() => setActiveTabFilter("All")}
                className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
                  activeTabFilter === "All"
                    ? "text-sky-700 font-bold border-b-2 border-sky-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({tabCounts.allCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter("My Audit")}
                className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
                  activeTabFilter === "My Audit"
                    ? "text-sky-700 font-bold border-b-2 border-sky-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                My Audit ({tabCounts.myCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter("Pending")}
                className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
                  activeTabFilter === "Pending"
                    ? "text-sky-700 font-bold border-b-2 border-sky-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pending ({tabCounts.pendingCount})
              </button>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto min-h-[260px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-2.5 px-3">Audit Plan</th>
                    <th className="py-2.5 px-3">Part Name</th>
                    <th className="py-2.5 px-3">Planned Month</th>
                    <th className="py-2.5 px-3 text-center">Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAudits.map((item) => {
                    const isSelected = item.id === selectedAudit.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedAuditId(item.id);
                          if (onSelectAudit) onSelectAudit(item);
                        }}
                        className={`transition-all cursor-pointer group select-none ${
                          isSelected
                            ? "bg-sky-50/90 ring-1 ring-inset ring-sky-400"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Audit Plan Code */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          <span
                            className={
                              isSelected
                                ? "text-sky-800 font-extrabold"
                                : "text-slate-700 group-hover:text-sky-700"
                            }
                          >
                            {item.audit_code}
                          </span>
                        </td>

                        {/* Part Name */}
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {item.part_name}
                        </td>

                        {/* Planned Month */}
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {item.planned_month}
                        </td>

                        {/* Attachment (Green Excel Icon Button) */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAuditId(item.id);
                              if (onSelectAudit) onSelectAudit(item);
                              openAuditInLocalExcel({
                                audit_code: item.audit_code,
                                part_name: item.part_name,
                                planned_month: item.planned_month,
                                auditor_name: item.auditor_name,
                                checkpoints: item.checkpoints,
                              });
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-bold shadow-2xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#107c41] text-white border-[#0e6b37] ring-2 ring-[#107c41]/30"
                                : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-[#107c41] hover:text-white"
                            }`}
                            title="Open directly in Microsoft Excel on your local system"
                          >
                            <span className="w-4 h-4 rounded-xs bg-white text-[#107c41] flex items-center justify-center font-black text-[10px] leading-none shadow-2xs">
                              x
                            </span>
                            <span>Excel</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAudits.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                        No audit records matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom "How it works" Info Box */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
              <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                i
              </div>
              <div>
                <span className="font-bold text-slate-800 block text-[11px]">How it works</span>
                <span className="text-[11px] text-slate-500">
                  Touch the Excel file to open and work on it directly.
                </span>
              </div>
            </div>
          </div>

          {/* ════════ RIGHT CONTAINER: MICROSOFT EXCEL ONLINE EDITOR ════════ */}
          <div className="lg:col-span-7 flex flex-col bg-white rounded-xl border border-slate-400 shadow-xl overflow-hidden font-sans">
            {/* Callout Banner */}
            <div className="bg-emerald-50/80 px-3 py-1 border-b border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>File opens directly for editing</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Active File:{" "}
                <strong className="text-slate-800">
                  {selectedAudit.audit_code}_{selectedAudit.part_name}_Audit.xlsx
                </strong>
              </div>
            </div>

            {/* EXCEL TITLE BAR */}
            <div className="flex items-center justify-between bg-[#107c41] text-white px-2.5 py-1.5 select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-1.5">
                  <div className="w-5 h-5 bg-white rounded-xs flex items-center justify-center text-[#107c41] font-black text-xs shadow-2xs">
                    X
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveToCloud}
                    className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                    title="Save (Ctrl+S)"
                  >
                    <Save className="h-4 w-4 text-white" />
                  </button>
                  <Undo className="h-4 w-4 opacity-50" />
                  <Redo className="h-4 w-4 opacity-50" />
                </div>
                <span className="font-semibold text-xs sm:text-sm tracking-wide truncate max-w-[200px] sm:max-w-[340px]">
                  {selectedAudit.audit_code}_{selectedAudit.part_name}_Audit.xlsx - {isSaving ? "Saving..." : "Saved"}
                </span>

                <button
                  type="button"
                  onClick={handleSaveToCloud}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded text-[11px] flex items-center gap-1 shadow-xs cursor-pointer ml-1"
                  title="Save changes to cloud (Ctrl + S)"
                >
                  <Save className="h-3 w-3" /> Save (Ctrl+S)
                </button>
              </div>

              <div className="flex items-center">
                <div className="hidden sm:flex items-center gap-2 mr-3 text-xs font-medium">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    {selectedAudit.auditor_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] text-emerald-100">{selectedAudit.auditor_name}</span>
                </div>
                <div className="flex items-center text-slate-200">
                  <button type="button" className="p-1 hover:bg-white/20 transition-colors rounded-xs">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportXlsx}
                    className="p-1 hover:bg-white/20 transition-colors rounded-xs"
                    title="Export local .xlsx"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.info("Active Excel view reset");
                    }}
                    className="p-1 hover:bg-[#e81123] transition-colors rounded-xs"
                    title="Close editor view"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* EXCEL RIBBON TABS */}
            <div className="flex items-center gap-4 px-3 pt-1.5 pb-0 bg-white border-b border-slate-200 text-[#107c41] text-xs font-semibold select-none overflow-x-auto">
              <span className="px-2.5 py-1 cursor-pointer hover:bg-slate-100 rounded-t text-slate-700">
                File
              </span>
              <span className="px-2.5 py-1 border-b-2 border-[#107c41] font-bold cursor-pointer text-[#107c41]">
                Home
              </span>
              <span className="px-2.5 py-1 text-slate-600 cursor-pointer hover:bg-slate-100 rounded-t">
                Insert
              </span>
              <span className="px-2.5 py-1 text-slate-600 cursor-pointer hover:bg-slate-100 rounded-t">
                Page Layout
              </span>
              <span className="px-2.5 py-1 text-slate-600 cursor-pointer hover:bg-slate-100 rounded-t">
                Formulas
              </span>
              <span className="px-2.5 py-1 text-slate-600 cursor-pointer hover:bg-slate-100 rounded-t">
                Data
              </span>
              <span className="px-2.5 py-1 text-slate-600 cursor-pointer hover:bg-slate-100 rounded-t">
                Review
              </span>
              <span className="px-2.5 py-1 text-slate-600 cursor-pointer hover:bg-slate-100 rounded-t">
                View
              </span>
              <span className="px-2.5 py-1 text-slate-600 cursor-pointer hover:bg-slate-100 rounded-t">
                Help
              </span>
            </div>

            {/* EXCEL RIBBON TOOLBAR */}
            <div className="flex items-center gap-3 bg-[#f3f2f1] px-3 py-1.5 border-b border-slate-300 shadow-2xs text-xs overflow-x-auto select-none">
              {/* Clipboard */}
              <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <div
                  onClick={() => toast.info("Paste")}
                  className="flex flex-col items-center justify-center text-slate-600 hover:bg-slate-200 p-0.5 rounded cursor-pointer"
                >
                  <ClipboardPaste className="h-4 w-4 text-amber-600" />
                  <span className="text-[9px] flex items-center leading-none">Paste</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button type="button" className="text-slate-600 hover:bg-slate-200 p-0.5 rounded cursor-pointer">
                    <Scissors className="h-3 w-3" />
                  </button>
                  <button type="button" className="text-slate-600 hover:bg-slate-200 p-0.5 rounded cursor-pointer">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Font */}
              <div className="flex flex-col gap-1 border-r border-slate-300 pr-2">
                <div className="flex items-center gap-1">
                  <select className="border border-slate-300 rounded text-[11px] px-1 py-0.5 bg-white w-20">
                    <option>Calibri</option>
                    <option>Arial</option>
                    <option>Segoe UI</option>
                  </select>
                  <select className="border border-slate-300 rounded text-[11px] px-1 py-0.5 bg-white w-10">
                    <option>11</option>
                    <option>12</option>
                    <option>14</option>
                  </select>
                </div>
                <div className="flex items-center gap-1 text-slate-700">
                  <button
                    type="button"
                    onClick={() => setFontBold(!fontBold)}
                    className={`p-0.5 px-1 rounded font-bold text-[11px] ${
                      fontBold ? "bg-slate-300 text-slate-900" : "hover:bg-slate-200"
                    }`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontItalic(!fontItalic)}
                    className={`p-0.5 px-1 rounded italic text-[11px] ${
                      fontItalic ? "bg-slate-300 text-slate-900" : "hover:bg-slate-200"
                    }`}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontUnderline(!fontUnderline)}
                    className={`p-0.5 px-1 rounded underline text-[11px] ${
                      fontUnderline ? "bg-slate-300 text-slate-900" : "hover:bg-slate-200"
                    }`}
                  >
                    U
                  </button>
                  <div className="w-px h-3 bg-slate-300 mx-0.5"></div>
                  <button type="button" className="hover:bg-slate-200 p-0.5 rounded">
                    <PaintBucket className="h-3 w-3 text-amber-500" />
                  </button>
                  <button type="button" className="hover:bg-slate-200 p-0.5 rounded">
                    <Type className="h-3 w-3 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Alignment */}
              <div className="flex items-center gap-1 border-r border-slate-300 pr-2 text-slate-700">
                <button
                  type="button"
                  onClick={() => setTextAlign("left")}
                  className={`p-1 rounded ${textAlign === "left" ? "bg-slate-300" : "hover:bg-slate-200"}`}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign("center")}
                  className={`p-1 rounded ${textAlign === "center" ? "bg-slate-300" : "hover:bg-slate-200"}`}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign("right")}
                  className={`p-1 rounded ${textAlign === "right" ? "bg-slate-300" : "hover:bg-slate-200"}`}
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Number format quick buttons */}
              <div className="flex items-center gap-1 border-r border-slate-300 pr-2 text-slate-700 font-mono text-xs">
                <button type="button" className="p-1 hover:bg-slate-200 rounded">$</button>
                <button type="button" className="p-1 hover:bg-slate-200 rounded">%</button>
                <button type="button" className="p-1 hover:bg-slate-200 rounded">,</button>
                <button type="button" className="p-1 hover:bg-slate-200 rounded">.00</button>
              </div>

              {/* Add Checkpoint Button */}
              <button
                type="button"
                onClick={handleAddCheckpointRow}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 text-[11px] font-bold shadow-2xs cursor-pointer ml-auto"
              >
                <Plus className="h-3 w-3 text-emerald-600" /> Add Row
              </button>
            </div>

            {/* FORMULA BAR */}
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 border-b border-slate-300 text-xs">
              <div className="w-14 border border-slate-300 bg-white px-1 py-0.5 text-center text-slate-700 font-mono font-bold select-none text-[11px]">
                {activeCell}
              </div>
              <div className="flex items-center gap-1 text-slate-400 select-none">
                <X className="h-3 w-3" />
                <CheckCircle2 className="h-3 w-3" />
                <span className="italic font-serif font-bold text-slate-600 mr-1 text-xs">fx</span>
              </div>
              <input
                type="text"
                value={activeFormulaText}
                onChange={(e) => handleFormulaBarChange(e.target.value)}
                placeholder="Formula / cell value"
                className="flex-1 border border-slate-300 bg-white px-2 py-0.5 h-6 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* GRID CONTAINER */}
            <div className="overflow-auto bg-[#e1dfdd] max-h-[380px] sm:max-h-[460px] relative text-xs">
              <div className="flex flex-col min-w-max bg-white shadow-xs m-1 border border-slate-300">
                {/* HEADER ROW (Letters A, B, C, D, E, F...) */}
                <div className="flex bg-[#f3f2f1] border-b border-slate-300 sticky top-0 z-20 text-slate-600 font-semibold text-[11px] select-none">
                  <div className="w-10 border-r border-slate-300 bg-[#e1dfdd] shrink-0"></div>
                  {COLUMNS.map((col) => (
                    <div
                      key={col}
                      className={`flex items-center justify-center border-r border-slate-300 py-1 ${getColWidth(
                        col
                      )}`}
                    >
                      {col}
                    </div>
                  ))}
                </div>

                {/* ROW 1: AUDIT CHECKLIST HEADER */}
                <div className="flex group bg-white">
                  <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 font-mono text-[11px] select-none shrink-0">
                    1
                  </div>
                  <div className="flex-1 flex border-b border-slate-300 bg-white text-center font-extrabold text-sm sm:text-base py-1.5 select-none tracking-wider text-slate-900 justify-center">
                    AUDIT CHECKLIST
                  </div>
                </div>

                {/* ROW 2: Audit Plan No / Planned Month */}
                <div className="flex group bg-white text-[11px]">
                  <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 font-mono text-[11px] select-none shrink-0">
                    2
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 font-bold text-slate-700 ${getColWidth(
                      "A"
                    )}`}
                  >
                    Audit Plan No
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 font-bold text-slate-600 ${getColWidth(
                      "B"
                    )}`}
                  >
                    : <span className="ml-2 font-mono text-sky-800 font-black">{selectedAudit.audit_code}</span>
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 font-bold text-slate-700 ${getColWidth(
                      "C"
                    )}`}
                  >
                    Planned Month :
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 font-medium text-slate-800 ${getColWidth(
                      "D"
                    )}`}
                  >
                    {selectedAudit.planned_month}
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 ${getColWidth(
                      "E"
                    )}`}
                  ></div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 ${getColWidth(
                      "F"
                    )}`}
                  ></div>
                </div>

                {/* ROW 3: Part Name / Auditor Name */}
                <div className="flex group bg-white text-[11px]">
                  <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 font-mono text-[11px] select-none shrink-0">
                    3
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 font-bold text-slate-700 ${getColWidth(
                      "A"
                    )}`}
                  >
                    Part Name
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 font-bold text-slate-600 ${getColWidth(
                      "B"
                    )}`}
                  >
                    : <span className="ml-2 font-bold text-slate-900">{selectedAudit.part_name}</span>
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 font-bold text-slate-700 ${getColWidth(
                      "C"
                    )}`}
                  >
                    Auditor Name :
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 font-medium text-slate-800 ${getColWidth(
                      "D"
                    )}`}
                  >
                    {selectedAudit.auditor_name}
                  </div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 ${getColWidth(
                      "E"
                    )}`}
                  ></div>
                  <div
                    className={`flex items-center border-r border-b border-slate-200 px-2 ${getColWidth(
                      "F"
                    )}`}
                  ></div>
                </div>

                {/* ROW 4: EMPTY SPACER */}
                <div className="flex group h-5 bg-white">
                  <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 font-mono text-[11px] select-none shrink-0">
                    4
                  </div>
                  <div className="flex-1 border-b border-slate-200 bg-white"></div>
                </div>

                {/* ROW 5: TABLE COLUMN HEADERS (Green-tinted) */}
                <div className="flex group bg-[#e2efda] font-extrabold text-center border-b border-slate-300 text-slate-800 text-[11px] select-none">
                  <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 font-mono text-[11px] shrink-0">
                    5
                  </div>
                  <div className={`border-r border-slate-300 py-1.5 ${getColWidth("A")}`}>S.No</div>
                  <div className={`border-r border-slate-300 py-1.5 ${getColWidth("B")}`}>Check Points</div>
                  <div className={`border-r border-slate-300 py-1.5 ${getColWidth("C")}`}>Specification</div>
                  <div className={`border-r border-slate-300 py-1.5 ${getColWidth("D")}`}>Observed Value</div>
                  <div className={`border-r border-slate-300 py-1.5 ${getColWidth("E")}`}>Status</div>
                  <div className={`border-r border-slate-300 py-1.5 ${getColWidth("F")}`}>Remarks</div>
                </div>

                {/* ROWS 6+: DATA ROWS */}
                {selectedAudit.checkpoints.map((cp, idx) => {
                  const rowNum = idx + 6;
                  return (
                    <div
                      key={cp.id}
                      className="flex group min-h-[28px] hover:bg-slate-50 bg-white text-slate-800 text-xs"
                    >
                      {/* Row number */}
                      <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 font-mono text-[11px] select-none shrink-0">
                        {rowNum}
                      </div>

                      {/* S.No */}
                      <div
                        className={`border-r border-b border-slate-200 flex items-center justify-center text-slate-600 font-mono font-bold ${getColWidth(
                          "A"
                        )}`}
                      >
                        {cp.sl_no ?? idx + 1}
                      </div>

                      {/* Check Points */}
                      <div
                        className={`border-r border-b border-slate-200 flex items-center px-2 text-slate-800 font-medium ${getColWidth(
                          "B"
                        )} ${activeCell === `B${rowNum}` ? "ring-2 ring-[#107c41] ring-inset z-10 bg-white" : ""}`}
                        onClick={() => {
                          setActiveCell(`B${rowNum}`);
                          setActiveFormulaText(cp.parameter);
                        }}
                      >
                        <input
                          type="text"
                          value={cp.parameter}
                          onChange={(e) => handleUpdateCheckpoint(cp.id, "parameter", e.target.value)}
                          className="w-full h-full outline-none bg-transparent"
                        />
                      </div>

                      {/* Specification */}
                      <div
                        className={`border-r border-b border-slate-200 flex items-center px-2 text-slate-700 ${getColWidth(
                          "C"
                        )} ${activeCell === `C${rowNum}` ? "ring-2 ring-[#107c41] ring-inset z-10 bg-white" : ""}`}
                        onClick={() => {
                          setActiveCell(`C${rowNum}`);
                          setActiveFormulaText(cp.specification);
                        }}
                      >
                        <input
                          type="text"
                          value={cp.specification}
                          onChange={(e) => handleUpdateCheckpoint(cp.id, "specification", e.target.value)}
                          className="w-full h-full outline-none bg-transparent"
                        />
                      </div>

                      {/* Observed Value (EDITABLE DIRECTLY) */}
                      <div
                        className={`border-r border-b border-slate-200 p-0 ${getColWidth(
                          "D"
                        )} ${activeCell === `D${rowNum}` ? "ring-2 ring-[#107c41] ring-inset z-10 bg-white" : ""}`}
                        onClick={() => {
                          setActiveCell(`D${rowNum}`);
                          setActiveFormulaText(cp.actual_value || "");
                        }}
                      >
                        <input
                          type="text"
                          value={cp.actual_value || ""}
                          onChange={(e) => handleUpdateCheckpoint(cp.id, "actual_value", e.target.value)}
                          placeholder="Observed value"
                          className="w-full h-full px-2 py-1 outline-none bg-transparent font-medium text-slate-900"
                        />
                      </div>

                      {/* Status (EDITABLE DIRECTLY) */}
                      <div
                        className={`border-r border-b border-slate-200 p-0 ${getColWidth(
                          "E"
                        )} ${activeCell === `E${rowNum}` ? "ring-2 ring-[#107c41] ring-inset z-10 bg-white" : ""}`}
                        onClick={() => {
                          setActiveCell(`E${rowNum}`);
                          setActiveFormulaText(cp.status || "OK");
                        }}
                      >
                        <select
                          value={cp.status || "OK"}
                          onChange={(e) => handleUpdateCheckpoint(cp.id, "status", e.target.value as any)}
                          className="w-full h-full px-1 py-1 outline-none bg-transparent appearance-none text-center font-bold cursor-pointer"
                          style={{
                            color:
                              cp.status === "OK" || cp.status === "Pass"
                                ? "#107c41"
                                : cp.status === "NOT OK" || cp.status === "Fail"
                                ? "#d13438"
                                : "inherit",
                          }}
                        >
                          <option value="OK">OK</option>
                          <option value="NOT OK">NOT OK</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                          <option value="-">-</option>
                        </select>
                      </div>

                      {/* Remarks (EDITABLE DIRECTLY) */}
                      <div
                        className={`border-r border-b border-slate-200 p-0 ${getColWidth(
                          "F"
                        )} ${activeCell === `F${rowNum}` ? "ring-2 ring-[#107c41] ring-inset z-10 bg-white" : ""}`}
                        onClick={() => {
                          setActiveCell(`F${rowNum}`);
                          setActiveFormulaText(cp.remarks || "");
                        }}
                      >
                        <input
                          type="text"
                          value={cp.remarks || ""}
                          onChange={(e) => handleUpdateCheckpoint(cp.id, "remarks", e.target.value)}
                          placeholder="-"
                          className="w-full h-full px-2 py-1 outline-none bg-transparent text-slate-700"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Extra Blank Grid Rows */}
                {[1, 2, 3, 4].map((i) => {
                  const emptyRowNum = selectedAudit.checkpoints.length + 5 + i;
                  return (
                    <div key={i} className="flex group min-h-[26px] bg-white">
                      <div className="w-10 bg-[#f3f2f1] border-r border-b border-slate-300 flex items-center justify-center text-slate-500 font-mono text-[11px] select-none shrink-0">
                        {emptyRowNum}
                      </div>
                      {COLUMNS.map((col) => (
                        <div
                          key={col}
                          className={`border-r border-b border-slate-200 ${getColWidth(col)}`}
                        ></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EXCEL STATUS BAR */}
            <div className="flex items-center justify-between bg-[#f3f2f1] border-t border-slate-300 px-3 py-1 text-xs text-slate-600 select-none">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-800">Ready</span>
                <span className="text-[10px] text-slate-400">| Autosave: On (Cloud Sync)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-white px-2 py-0.5 border border-slate-300 shadow-2xs text-[#107c41] font-bold text-[11px]">
                  Audit Checklist
                </div>
                <div
                  onClick={handleAddCheckpointRow}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer font-bold px-1"
                  title="Add new sheet / checkpoint"
                >
                  +
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span
                    className="cursor-pointer font-bold px-1"
                    onClick={() => setZoomLevel((z) => Math.max(z - 10, 50))}
                  >
                    ⊟
                  </span>
                  <div className="w-16 h-1 bg-slate-300 rounded-full relative">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-3.5 bg-slate-500 rounded-xs"
                      style={{ left: `${Math.min(Math.max(zoomLevel - 50, 0), 100)}%` }}
                    ></div>
                  </div>
                  <span
                    className="cursor-pointer font-bold px-1"
                    onClick={() => setZoomLevel((z) => Math.max(z + 10, 150))}
                  >
                    ⊞
                  </span>
                  <span className="ml-1 w-8 text-center text-[10px] font-mono">{zoomLevel}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
