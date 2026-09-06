import React, { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileCheck,
  X,
  FileUp,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recordSubmittedAudit } from "@/lib/submittedAudits";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export interface ExportAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: {
    id: string;
    audit_code: string;
    title: string;
    audit_type: string;
    area: string;
    assigned_to_employee_number?: string;
    due_date?: string;
    status?: string;
  } | null;
  onSuccess?: (() => void) | undefined;
  onDownloadExcel?: (() => void) | undefined;
}

export function ExportAuditModal({
  isOpen,
  onClose,
  audit,
  onSuccess,
  onDownloadExcel,
}: ExportAuditModalProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // Step: "select" (choose OK vs Deviation) | "ok_upload" (attach completed Excel file)
  const [step, setStep] = useState<"select" | "ok_upload">("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !audit) return null;

  const handleReset = () => {
    setStep("select");
    setSelectedFile(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSelectOK = () => {
    setStep("ok_upload");
  };

  const handleSelectDeviation = () => {
    // 1. Prepare prefill data for 2-Page Deviation Form
    const prefill = {
      audit_id: audit.id,
      audit_code: audit.audit_code,
      title: `Audit ${audit.audit_code} Deviation — ${audit.title}`,
      location: audit.area || "Plant Line",
      severity: "High" as const,
      part_name: audit.title,
      part_no: audit.audit_code,
      assigned_emp: profile?.employee_number || audit.assigned_to_employee_number || "688079",
      segregated_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
      from_dept: audit.area || "Quality Assurance",
      to_dept: "Production / Machining",
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_deviation_prefill", JSON.stringify(prefill));
    }

    toast.info("Opening Two-Page Deviation Report form. Please complete and submit both pages.", {
      duration: 4000,
    });

    handleReset();
    navigate({ to: "/deviations" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (.xlsx, .xls, .csv)
    const validExts = [".xlsx", ".xls", ".csv"];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error("Please upload a valid Excel spreadsheet file (.xlsx, .xls, .csv).");
      return;
    }

    setSelectedFile(file);
    toast.success(`Attached completed file: ${file.name}`);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validExts = [".xlsx", ".xls", ".csv"];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error("Please upload a valid Excel spreadsheet file (.xlsx, .xls, .csv).");
      return;
    }

    setSelectedFile(file);
    toast.success(`Attached completed file: ${file.name}`);
  };

  const handleOKSubmit = async () => {
    if (!selectedFile) {
      toast.error("You must upload/attach the completed Excel file before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const formattedDate = format(now, "dd MMM yyyy, hh:mm a");

      // Record in submitted audits registry
      recordSubmittedAudit({
        audit_code: audit.audit_code,
        part_no: audit.audit_code,
        part_name: audit.title,
        employee_name: profile?.full_name || "Auditor",
        employee_number: profile?.employee_number || audit.assigned_to_employee_number || "688079",
        department: audit.area || "Quality Assurance",
        submitted_date: now.toISOString(),
        formatted_submitted_date: formattedDate,
        status: "Under Review",
        checkpoints_count: 5,
        failing_count: 0,
      });

      // Update local storage tasks
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sakthi_excel_tasks_v8");
        if (stored) {
          try {
            let tasks = JSON.parse(stored);
            tasks = tasks.map((t: any) => {
              if (t.id === audit.id || t.audit_code === audit.audit_code) {
                return { ...t, status: "Under Review", attached_file_name: selectedFile.name };
              }
              return t;
            });
            localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
            window.dispatchEvent(new Event("excel_tasks_updated"));
          } catch {
            // Ignore
          }
        }
      }

      // Update in Supabase
      await supabase
        .from("audit_assignments")
        .update({ status: "Under Review" as any })
        .eq("audit_code", audit.audit_code);

      toast.success(`✓ Audit ${audit.audit_code} submitted with ${selectedFile.name}!`, {
        description: "Status moved to Under Review for Admin approval.",
        duration: 4500,
      });

      if (onSuccess) onSuccess();
      handleReset();
    } catch (err: any) {
      toast.error("Failed to submit audit: " + (err?.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {step === "select" ? "Submit Audit Result" : "Attach Completed Excel File"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {audit.audit_code} · {audit.title}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Select Result (OK vs Deviation) */}
        {step === "select" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-1">Audit Export Workflow:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>
                  <span className="font-medium text-emerald-800">Select OK</span> if all checklist checkpoints passed. You will be prompted to attach the completed Excel file to move to <span className="font-semibold">Under Review</span>.
                </li>
                <li>
                  <span className="font-medium text-rose-800">Select Deviation</span> if any non-conformance was observed. You will complete the <span className="font-semibold">Two-Page Deviation Report</span>.
                </li>
              </ul>
            </div>

            {onDownloadExcel && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-medium">
                  <Download className="h-4 w-4 text-emerald-700" />
                  <span>Need the assigned Excel template to complete offline?</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDownloadExcel}
                  className="h-7 text-xs border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-100"
                >
                  Download Excel
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSelectOK}
                className="group flex flex-col items-center justify-center p-5 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-500 transition-all text-center cursor-pointer shadow-xs active:scale-98"
              >
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <span className="text-base font-bold text-emerald-900">Result: OK</span>
                <span className="text-[11px] text-emerald-700 mt-1">
                  Attach Excel & Submit for Admin Review
                </span>
              </button>

              <button
                type="button"
                onClick={handleSelectDeviation}
                className="group flex flex-col items-center justify-center p-5 rounded-xl border-2 border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-500 transition-all text-center cursor-pointer shadow-xs active:scale-98"
              >
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all mb-2">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <span className="text-base font-bold text-amber-900">Result: Deviation</span>
                <span className="text-[11px] text-amber-700 mt-1">
                  Open 2-Page Deviation Report Form
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Attach Completed Excel File for OK Result */}
        {step === "ok_upload" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3 text-xs text-emerald-900">
              <p className="font-semibold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Result Confirmed: OK (All Checkpoints Pass)
              </p>
              <p className="text-emerald-700 mt-1">
                Please attach your completed and saved Excel file (.xlsx) to submit to the Admin Under Review queue.
              </p>
            </div>

            {/* Drag & Drop File Upload Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                selectedFile
                  ? "border-emerald-500 bg-emerald-50/40"
                  : "border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-brand"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileCheck className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">{selectedFile.name}</div>
                  <div className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Ready to Submit
                  </div>
                  <span className="text-xs font-semibold text-brand underline pt-1">
                    Click to change file
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                    <FileUp className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    Click to browse or drag & drop completed Excel file
                  </div>
                  <div className="text-xs text-slate-500">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("select")}
                className="text-xs"
              >
                Back to Selection
              </Button>

              <Button
                onClick={handleOKSubmit}
                disabled={!selectedFile || isSubmitting}
                className="gap-2 bg-brand hover:bg-brand-hover text-white text-xs font-bold px-4"
              >
                <Upload className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit to Under Review"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
