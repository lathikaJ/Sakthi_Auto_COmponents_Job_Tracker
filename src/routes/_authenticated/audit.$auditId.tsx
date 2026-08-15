import React, { useState, useRef, useCallback } from "react";
import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  AlertTriangle,
  FileCheck,
  Save,
  ArrowLeft,
  PenTool,
  ShieldCheck,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Camera,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/audit/$auditId")({
  component: AuditFormPage,
});

type CheckpointItem = {
  id: string;
  parameter: string;
  specification: string;
  actual_value: string;
  status: "Pass" | "Fail" | "Pending";
};

function AuditFormPage() {
  const { auditId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Wizard Step State: 1 = Checkpoints, 2 = Notes & Photos, 3 = E-Signature & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Checkpoints State
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>([
    {
      id: `cp-${Date.now()}`,
      parameter: "",
      specification: "",
      actual_value: "",
      status: "Pass",
    },
  ]);

  // Notes & Photos State
  const [inspectorNotes, setInspectorNotes] = useState("");
  const [imageFiles, setImageFiles] = useState<(string | null)[]>([null, null, null]);
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // E-Signature Image Upload State
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [sigDragOver, setSigDragOver] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo File Upload
  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        const newImages = [...imageFiles];
        newImages[index] = result;
        setImageFiles(newImages);
        toast.success(`Inspection photo ${index + 1} uploaded!`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...imageFiles];
    newImages[index] = null;
    setImageFiles(newImages);
    if (fileInputRefs[index]?.current) {
      fileInputRefs[index]!.current!.value = "";
    }
    toast.info(`Photo ${index + 1} removed.`);
  };

  // Handle Signature Upload
  const handleSignatureFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, SVG, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Signature image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setSignatureImage(result);
      setSignedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
      toast.success("E-Signature uploaded and verified!");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSigInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSignatureFile(file);
  };

  const handleSigDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSigDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleSignatureFile(file);
  };

  const clearSignature = () => {
    setSignatureImage(null);
    setSignedAt(null);
    if (sigInputRef.current) sigInputRef.current.value = "";
    toast.info("E-Signature cleared.");
  };

  // Checkpoint handlers
  const handleParamChange = (id: string, parameter: string) => {
    setCheckpoints((prev) => prev.map((cp) => (cp.id === id ? { ...cp, parameter } : cp)));
  };

  const handleSpecChange = (id: string, specification: string) => {
    setCheckpoints((prev) => prev.map((cp) => (cp.id === id ? { ...cp, specification } : cp)));
  };

  const handleValueChange = (id: string, actual_value: string) => {
    setCheckpoints((prev) => prev.map((cp) => (cp.id === id ? { ...cp, actual_value } : cp)));
  };

  const handleToggleStatus = (id: string, status: "Pass" | "Fail") => {
    setCheckpoints((prev) => prev.map((cp) => (cp.id === id ? { ...cp, status } : cp)));
  };

  const addCheckpointRow = () => {
    setCheckpoints((prev) => [
      ...prev,
      { id: `cp-${Date.now()}`, parameter: "", specification: "", actual_value: "", status: "Pass" },
    ]);
  };

  const deleteCheckpointRow = (id: string) => {
    setCheckpoints((prev) => prev.filter((cp) => cp.id !== id));
  };

  // Save Draft
  const handleSaveDraft = () => {
    const draftData = {
      auditId,
      checkpoints,
      imageFiles,
      inspectorNotes,
      signatureImage,
      signedAt,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(`sakthi_audit_draft_${auditId}`, JSON.stringify(draftData));
    }
    toast.success("Audit checkpoint draft saved!");
  };

  // Submit Completed Audit
  const handleSubmitAudit = () => {
    if (!signatureImage) {
      toast.error("Please upload your e-signature before submitting.");
      return;
    }
    const hasFailures = checkpoints.some((cp) => cp.status === "Fail");
    if (hasFailures) {
      toast.warning("Audit has failing checkpoints — please raise a deviation before submitting.");
      return;
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_excel_tasks");
      let tasks = stored ? JSON.parse(stored) : [];
      let found = false;
      tasks = tasks.map((t: any) => {
        if (t.id === auditId || t.audit_code === auditId) {
          found = true;
          return { ...t, status: "Completed" };
        }
        return t;
      });
      if (!found) {
        tasks.push({
          id: auditId,
          audit_code: auditId.startsWith("AUD") ? auditId : `AUD-${auditId}`,
          title: `Completed Inspection (${auditId})`,
          audit_type: "Product",
          area: "Quality Inspection",
          assigned_to_employee_number: profile?.employee_number || "1002",
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          due_date: new Date().toISOString().split("T")[0],
          status: "Completed",
        });
      }
      localStorage.setItem("sakthi_excel_tasks", JSON.stringify(tasks));
      window.dispatchEvent(new Event("excel_tasks_updated"));
    }

    toast.success("Audit completed and moved to Completed Audit!");
    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 1200);
  };

  // Raise Deviation
  const handleRaiseDeviation = () => {
    const failed = checkpoints.filter((cp) => cp.status === "Fail");
    if (failed.length === 0) return;

    const desc = failed
      .map((cp) => `${cp.parameter || "Parameter"} (Spec: ${cp.specification || "N/A"}, Got: ${cp.actual_value || "N/A"})`)
      .join(" | ");

    const prefill = {
      title: `Audit ${auditId} — Checkpoint Failure: ${failed.map((c) => c.parameter || "Unknown").join(", ")}`,
      observed_condition: desc,
      location: `Audit ID: ${auditId}`,
      severity: "High" as const,
      assigned_emp: profile?.employee_number || "1001",
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_deviation_prefill", JSON.stringify(prefill));

      const stored = localStorage.getItem("sakthi_excel_tasks");
      if (stored) {
        try {
          let tasks = JSON.parse(stored);
          tasks = tasks.map((t: any) => {
            if (t.id === auditId || t.audit_code === auditId) {
              return { ...t, status: "Deviation" };
            }
            return t;
          });
          localStorage.setItem("sakthi_excel_tasks", JSON.stringify(tasks));
          window.dispatchEvent(new Event("excel_tasks_updated"));
        } catch {
          // Ignore
        }
      }
    }
    toast.info("Navigating to Deviations — task moved to Deviation Audit.");
    navigate({ to: "/deviations" });
  };

  const failedCheckpoints = checkpoints.filter((cp) => cp.status === "Fail");

  return (
    <AppShell
      title={`Audit Inspection Execution (ID: ${auditId})`}
      description="Step-by-step inspection wizard: measure checkpoints, upload component photos, and attach inspector e-signature."
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Back Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Inspection Ready
          </span>
        </div>

        {/* ── STEP-BY-STEP PROGRESS WIZARD BAR ── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-3 gap-2">
            {/* Step 1 Indicator */}
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                currentStep === 1
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-xs"
                  : currentStep > 1
                  ? "border-emerald-200 bg-emerald-50/30 text-slate-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  currentStep === 1
                    ? "bg-emerald-600 text-white"
                    : currentStep > 1
                    ? "bg-emerald-200 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold">Step 1: Checkpoints</p>
                <p className="text-[11px] font-medium text-slate-500">Measure parameters</p>
              </div>
            </button>

            {/* Step 2 Indicator */}
            <button
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                currentStep === 2
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-xs"
                  : currentStep > 2
                  ? "border-emerald-200 bg-emerald-50/30 text-slate-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  currentStep === 2
                    ? "bg-emerald-600 text-white"
                    : currentStep > 2
                    ? "bg-emerald-200 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {currentStep > 2 ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold">Step 2: Evidence Photos</p>
                <p className="text-[11px] font-medium text-slate-500">Notes & components</p>
              </div>
            </button>

            {/* Step 3 Indicator */}
            <button
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                currentStep === 3
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-xs"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  currentStep === 3 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                3
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold">Step 3: E-Signature</p>
                <p className="text-[11px] font-medium text-slate-500">Verify & submit</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── STEP 1 CONTENT: CHECKPOINTS & MEASUREMENTS ── */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-emerald-600" /> Step 1: Quality Checkpoints & Specifications
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Enter parameters, target specifications, and actual measured values.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCheckpointRow}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-xs"
                >
                  + Add Checkpoint Row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                      <th className="p-3 w-10 font-bold">#</th>
                      <th className="p-3 min-w-[220px] font-bold">Inspection Parameter</th>
                      <th className="p-3 w-44 font-bold">Target Specification</th>
                      <th className="p-3 w-44 font-bold">Actual Value Measured</th>
                      <th className="p-3 text-center w-36 font-bold">Result</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900">
                    {checkpoints.map((cp, idx) => (
                      <tr key={cp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={cp.parameter}
                            onChange={(e) => handleParamChange(cp.id, e.target.value)}
                            placeholder="e.g. Journal Diameter"
                            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={cp.specification}
                            onChange={(e) => handleSpecChange(cp.id, e.target.value)}
                            placeholder="e.g. 52.000mm ± 0.005"
                            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={cp.actual_value}
                            onChange={(e) => handleValueChange(cp.id, e.target.value)}
                            placeholder="Enter measured value"
                            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(cp.id, "Pass")}
                              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                                cp.status === "Pass"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              Pass
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(cp.id, "Fail")}
                              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                                cp.status === "Fail"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              Fail
                            </button>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => deleteCheckpointRow(cp.id)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Remove row"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {checkpoints.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs font-semibold text-slate-400">
                          No checkpoints added yet. Click "+ Add Checkpoint Row" above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(2)}
                className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-sm text-xs"
              >
                Next: Evidence Photos & Notes <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2 CONTENT: NOTES & EVIDENCE PHOTOS ── */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Inspector Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" /> Inspector Observations & Process Notes
              </h2>
              <textarea
                rows={3}
                placeholder="Record any additional notes, equipment settings, tool serial numbers, or environmental conditions..."
                value={inspectorNotes}
                onChange={(e) => setInspectorNotes(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-3 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Image Upload Slots */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-emerald-600" /> Component Evidence Photos (Up to 3 Images)
                </h3>
                <span className="text-xs text-slate-500 font-medium">PNG, JPG, WEBP up to 10MB</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => {
                  const src = imageFiles[index];

                  return (
                    <div
                      key={index}
                      className="relative flex flex-col items-center justify-center min-h-[160px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 transition-all hover:border-emerald-500 hover:bg-emerald-50/20"
                    >
                      <input
                        type="file"
                        ref={fileInputRefs[index]}
                        accept="image/*"
                        onChange={(e) => handleFileChange(index, e)}
                        className="hidden"
                      />

                      {src ? (
                        <div className="relative w-full h-full flex flex-col items-center">
                          <img
                            src={src}
                            alt={`Inspection Photo ${index + 1}`}
                            className="h-32 w-full object-cover rounded-lg border border-slate-200 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 rounded-full bg-rose-600 p-1 text-white shadow-md hover:bg-rose-700"
                            title="Remove Image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <span className="mt-1.5 text-[11px] font-bold text-slate-700">
                            Photo {index + 1} Uploaded
                          </span>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRefs[index].current?.click()}
                          className="flex flex-col items-center justify-center cursor-pointer text-center space-y-2 p-2 w-full h-full"
                        >
                          <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Upload Photo {index + 1}</p>
                            <p className="text-[11px] text-slate-500 font-medium">Click or drag & drop</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="gap-2 border-slate-300 text-xs font-bold text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Checkpoints
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-sm text-xs"
              >
                Next: E-Signature & Sign-off <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3 CONTENT: E-SIGNATURE & AUTHORIZATION ── */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Inspector E-Signature */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PenTool className="h-4 w-4 text-emerald-600" /> Step 3: Inspector E-Signature Upload
              </h3>

              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-xs font-semibold text-slate-700">
                  <span className="font-bold text-slate-900">
                    {profile?.full_name || profile?.employee_number || "Inspector"}
                  </span>
                  {profile?.employee_number && (
                    <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                      Emp #{profile.employee_number}
                    </span>
                  )}
                  {signedAt && (
                    <span className="ml-3 text-emerald-700 font-bold">✓ Signed at {signedAt}</span>
                  )}
                </div>
              </div>

              {signatureImage ? (
                <div className="relative flex flex-col items-center gap-3 rounded-xl border-2 border-emerald-400 bg-emerald-50/40 p-5">
                  <span className="absolute right-3 top-3">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="flex items-center gap-1 rounded border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-600 shadow-xs hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  </span>
                  <img
                    src={signatureImage}
                    alt="E-Signature"
                    className="max-h-28 max-w-xs rounded border border-emerald-200 bg-white object-contain shadow-sm"
                  />
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> E-Signature verified and attached
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setSigDragOver(true); }}
                  onDragLeave={() => setSigDragOver(false)}
                  onDrop={handleSigDrop}
                  onClick={() => sigInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
                    sigDragOver
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <Upload className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-800">Upload your E-Signature Image</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Drag & drop or click — PNG, JPG, SVG accepted · Max 5MB
                    </p>
                  </div>
                  <span className="rounded-lg border border-emerald-400 bg-white px-4 py-1.5 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-50 transition-colors">
                    Choose Signature File
                  </span>
                </div>
              )}

              <input
                ref={sigInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSigInputChange}
              />
            </div>

            {/* Failed Checkpoint Alert Banner */}
            {failedCheckpoints.length > 0 && (
              <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-rose-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {failedCheckpoints.length} Checkpoint{failedCheckpoints.length > 1 ? "s" : ""} Failed — Deviation Required
                    </div>
                    <ul className="ml-6 list-disc space-y-0.5">
                      {failedCheckpoints.map((cp) => (
                        <li key={cp.id} className="text-xs font-semibold text-rose-700">
                          <span className="font-bold">{cp.parameter || "Unnamed parameter"}</span>
                          {cp.specification && <span className="text-rose-600"> · Spec: {cp.specification}</span>}
                          {cp.actual_value && <span className="text-rose-600"> · Got: {cp.actual_value}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={handleRaiseDeviation}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
                  >
                    <AlertTriangle className="h-4 w-4" /> Raise Deviation for Failed Checkpoints
                  </button>
                </div>
              </div>
            )}

            {/* Final Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="gap-2 border-slate-300 text-xs font-bold text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Photos
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="gap-2 border-slate-300 bg-white text-slate-800 font-bold hover:bg-slate-100 text-xs"
                >
                  <Save className="h-4 w-4 text-slate-600" /> Save Draft
                </Button>

                <Button
                  onClick={handleSubmitAudit}
                  className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-sm text-xs"
                >
                  <CheckCircle2 className="h-4 w-4" /> Submit Completed Audit
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
