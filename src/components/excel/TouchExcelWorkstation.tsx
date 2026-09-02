import React, { useState, useEffect, useMemo } from "react";
import { Search, Bell, X, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { openAuditInLocalExcel, DEFAULT_CHECKPOINTS } from "@/lib/auditExcel";

export interface AuditRecordItem {
  id: string;
  audit_code: string;
  part_name: string;
  planned_month: string;
  auditor_name: string;
  status: "Assigned" | "In Progress" | "Under Review" | "Completed" | "Pending";
  checkpoints: Array<{
    id?: string;
    sl_no?: number;
    parameter: string;
    specification: string;
    actual_value?: string;
    status?: string;
    remarks?: string;
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
    checkpoints: DEFAULT_CHECKPOINTS,
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

  // Persistent storage key synced across sessions
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

  const [selectedAuditId, setSelectedAuditId] = useState<string>("ap-002");
  const [activeTabFilter, setActiveTabFilter] = useState<"All" | "My Audit" | "Pending">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync state across storage updates
  useEffect(() => {
    const handleSync = () => {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAudits(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener("sakthi_submitted_audits_updated", handleSync);
    return () => window.removeEventListener("sakthi_submitted_audits_updated", handleSync);
  }, []);

  // Filter left list
  const filteredAudits = useMemo(() => {
    return audits.filter((item) => {
      if (activeTabFilter === "My Audit") {
        const isMine =
          item.auditor_name.toLowerCase().includes(currentAuditorName.toLowerCase()) ||
          item.auditor_name.toLowerCase().includes("yaswanth");
        if (!isMine) return false;
      } else if (activeTabFilter === "Pending") {
        if (item.status === "Completed") return false;
      }

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

  const handleLaunchExcel = (item: AuditRecordItem) => {
    setSelectedAuditId(item.id);
    if (onSelectAudit) onSelectAudit(item);

    // Launch directly in MS Excel App with no download, synced to all employee logins
    openAuditInLocalExcel({
      id: item.id,
      audit_code: item.audit_code,
      part_name: item.part_name,
      planned_month: item.planned_month,
      auditor_name: item.auditor_name,
      checkpoints: item.checkpoints,
    });
  };

  return (
    <div className={`w-full flex flex-col items-center space-y-4 ${className}`}>
      {/* ── TOP PRESENTATION HEADER ── */}
      <div className="text-center py-2 select-none">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0c2340] tracking-tight flex items-center justify-center gap-2">
          Touch Excel File <span className="text-sky-600 font-black">→</span> Work Directly in MS Excel App
        </h2>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
          Tap the Excel file to open directly in Microsoft Excel. All typed values sync across all employee accounts.
        </p>
      </div>

      {/* ── ONGOING AUDIT CARD CONTAINER (MATCHING CLIENT REFERENCE) ── */}
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden font-sans">
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
                <th className="py-2.5 px-4">Audit Plan</th>
                <th className="py-2.5 px-4">Part Name</th>
                <th className="py-2.5 px-4">Planned Month</th>
                <th className="py-2.5 px-4 text-center">Attachment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAudits.map((item) => {
                const isSelected = item.id === selectedAuditId;
                return (
                  <tr
                    key={item.id}
                    onClick={() => handleLaunchExcel(item)}
                    className={`transition-all cursor-pointer group select-none ${
                      isSelected
                        ? "bg-sky-50/90 ring-1 ring-inset ring-sky-400"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Audit Plan Code */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
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
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.part_name}
                    </td>

                    {/* Planned Month */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {item.planned_month}
                    </td>

                    {/* Attachment (Green Excel Icon Button) */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchExcel(item);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-bold shadow-2xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#107c41] text-white border-[#0e6b37] ring-2 ring-[#107c41]/30"
                            : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-[#107c41] hover:text-white"
                        }`}
                        title="Click to open directly in Microsoft Excel App (No browser download)"
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
              Touch the Excel file to open and work on it directly in Microsoft Excel. All changes are saved and synced across all employee logins.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
