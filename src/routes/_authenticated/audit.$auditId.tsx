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
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

import { recordSubmittedAudit } from "@/lib/submittedAudits";
import { authenticateAndGetSignature } from "@/lib/electronicSignatures";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/audit/$auditId")({
  component: AuditFormPage,
});

type CheckpointItem = {
  id: string;
  sl_no?: number | string;
  parameter: string;
  specification: string;
  check_method?: string;
  actual_value: string;
  status: "Pass" | "Fail" | "Pending";
  remarks?: string;
};

function AuditFormPage() {
  const { auditId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Part & Inspection metadata states (Matching Industrial PDF Form)
  const [customer, setCustomer] = useState("MSIL");
  const [partNo, setPartNo] = useState("45111 M 55TA0 / 45151 M 55TA0 (ABS - NOPAINT)");
  const [partName, setPartName] = useState("KNUCKLE STEERING R/L - YTA / YTB");
  const [revNo, setRevNo] = useState("A");
  const [dateCode, setDateCode] = useState("DC-2026-08");
  const [traceability, setTraceability] = useState("OP-010 / OP-020");

  // Wizard Step State: 1 = Checkpoints, 2 = Notes & Photos, 3 = E-Signature & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Checkpoints State
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>([
    {
      id: `cp-${Date.now()}`,
      parameter: "",
      specification: "",
      check_method: "Visual",
      actual_value: "",
      status: "Pass",
      remarks: "",
    },
  ]);

  // Dynamic audit preset initialization based on auditId
  React.useEffect(() => {
    if (auditId.includes("STELL") || auditId.includes("DOC")) {
      setCustomer("STELLANTIS");
      setPartNo("9845800980 & 9845801180");
      setPartName("PIVOT SUSPENSION GOA CC21 ( D78 ) LH / RH");
      setCheckpoints([
        { id: "cp-1", parameter: "MASTER SAMPLE COMPARISON (QF/08/CQA-37)", specification: "Should be compared with master sample (All radius, chamfer, profile, milling)", check_method: "Visual Comparison", actual_value: "Conforms to Master", status: "Pass", remarks: "All profiles OK" },
        { id: "cp-2", parameter: "APPEARANCE 10-POINT CHECK", specification: "No blow hole, pin hole, wall thickness variation, sharp edge, dent/damage, flaws, rust, paint peel off", check_method: "10-Point Visual Check", actual_value: "OK (10/10)", status: "Pass", remarks: "Clean surface" },
        { id: "cp-3", parameter: "RP OIL CONDITION VERIFICATION", specification: "No excess oil, no dust/burr/scrap, no foreign particles", check_method: "Visual & Wipe Check", actual_value: "Verified OK", status: "Pass", remarks: "No foreign scrap" },
        { id: "cp-4", parameter: "PACKING BOX & VCI COVER CONDITION", specification: "Proper center pad/foam, no box damage, VCI cover clean", check_method: "Visual Inspection", actual_value: "Good Condition", status: "Pass", remarks: "VCI Sealed" },
        { id: "cp-5", parameter: "PACKING OF PARTS VERIFICATION", specification: "Qty per layer = 24, Qty per box = 144, labeling info verified", check_method: "Count & Label Verification", actual_value: "144 NOS (24x6)", status: "Pass", remarks: "Box Tag OK" },
        { id: "cp-6", parameter: "PART MIXUP PREVENTION", specification: "Ensure no part mixup", check_method: "Visual & Part Stamp", actual_value: "Verified No Mixup", status: "Pass", remarks: "Match Stamp" },
        { id: "cp-7", parameter: "AVAILABILITY OF COMMITMENT MARK", specification: "Ensure availability of commitment mark if any", check_method: "Visual Inspection", actual_value: "Present", status: "Pass", remarks: "Green Dot Marked" },
        { id: "cp-8", parameter: "FOREIGN PARTICLES IN BOX", specification: "Ensure no foreign particles in the box", check_method: "Visual Cleanliness", actual_value: "Clean Box", status: "Pass", remarks: "Pass" },
        { id: "cp-9", parameter: "PACKING LABEL & STATUS", specification: "Packing label pasted on box with correct part name/number (9845800980/1180)", check_method: "Barcode Scanner & Visual", actual_value: "Label Attached", status: "Pass", remarks: "Scanned OK" },
      ]);
    } else if (auditId.includes("VOL") || auditId.includes("LAY")) {
      setCustomer("VOLVO");
      setPartNo("23407840 / P03");
      setPartName("FAN BRACKET LOW FAN HUB");
      setCheckpoints([
        { id: "cp-1", parameter: "DISTANCE M", specification: "4 x 47.7±0.2 (CMM / Height Vernier & Scriber)", check_method: "CMM / Height Vernier", actual_value: "47.72 mm", status: "Pass", remarks: "Within spec" },
        { id: "cp-2", parameter: "THICKNESS M", specification: "4 x 22.5±0.3 (Micrometer)", check_method: "Digital Micrometer", actual_value: "22.51 mm", status: "Pass", remarks: "Within spec" },
        { id: "cp-3", parameter: "ROUGHNESS ON DATUM 'A' OPPOSITE SIDE M", specification: "6.3 Ra (Surf Tester)", check_method: "Surface Roughness Tester", actual_value: "6.1 Ra", status: "Pass", remarks: "Smooth" },
        { id: "cp-4", parameter: "PARALLELISM ON DATUM 'A' OPPOSITE SIDE - 4 PLACES M", specification: "4 x f/0.2/A (Height Vernier & Dial / CMM)", check_method: "Dial Gauge & CMM", actual_value: "0.14 mm", status: "Pass", remarks: "Parallel" },
        { id: "cp-5", parameter: "HOLE CHAMFER (As per RTS) M", specification: "0.5 ±0.1 (Height Vernier Scriber)", check_method: "Height Vernier Scriber", actual_value: "0.52 mm", status: "Pass", remarks: "OK" },
        { id: "cp-6", parameter: "HOLE CHAMFER (As per RTS) M", specification: "45° ±2° (Bevel Protractor)", check_method: "Bevel Protractor", actual_value: "45.1°", status: "Pass", remarks: "Angle verified" },
        { id: "cp-7", parameter: "ROUGHNESS ON THREAD FACE M", specification: "Ra 6.3 (Surf Tester)", check_method: "Surface Tester", actual_value: "6.2 Ra", status: "Pass", remarks: "OK" },
      ]);
    } else {
      setCustomer("MSIL");
      setPartNo("45111 M 55TA0 / 45151 M 55TA0 (ABS - NOPAINT)");
      setPartName("KNUCKLE STEERING R/L - YTA / YTB");
      setCheckpoints([
        { id: "cp-1", parameter: "HARDNESS (MSIL QF/08/CQA-09)", specification: "164 ~ 188 BHN / 85 ~ 91HRB", check_method: "Brinell Hardness Tester", actual_value: "176 BHN", status: "Pass", remarks: "Conforms" },
        { id: "cp-2", parameter: "MICROSTRUCTURE SPHEROIDIZATION & PEARLITE", specification: "% OF SPHEROIDIZATION 80% MIN | % OF PEARLITE 10-40% MAX | NODULE COUNT >=70 PCS/mm² MIN", check_method: "Metallurgical Microscope", actual_value: "Spheroidization 85%, Pearlite 25%", status: "Pass", remarks: "Nodule 82 PCS/mm²" },
        { id: "cp-3", parameter: "TENSILE STRENGTH", specification: "500 MPa MIN", check_method: "Universal Testing Machine", actual_value: "525 MPa", status: "Pass", remarks: "Exceeds min" },
        { id: "cp-4", parameter: "YIELD STRENGTH @ 0.2% & 0.5%", specification: "YIELD STRENGTH @ 0.2%: 320 MPa MIN | YIELD STRENGTH @ 0.5%: 340 MPa MIN", check_method: "UTM Extensometer", actual_value: "@0.2%: 338 MPa | @0.5%: 355 MPa", status: "Pass", remarks: "Pass" },
        { id: "cp-5", parameter: "ELONGATION & IMPACT STRENGTH", specification: "ELONGATION 10% MIN | IMPACT STRENGTH - 8J/cm² MIN", check_method: "Charpy Impact & Tensile Tester", actual_value: "Elongation 12%, Impact 9.5 J/cm²", status: "Pass", remarks: "Pass" },
        { id: "cp-6", parameter: "OP-010 : RECEIVING INSPECTION ROUGH CASTING (APPEARANCE)", specification: "1. Free of crack/flaw/harmful blow hole 2. Over grinding & rust free 3. Legible casting letters (mould lot, cavity) 4. Surface per CFT-16 5. Hardness mark at OP20 6. 'X' mark for X-ray completion at OP20", check_method: "Visual & Gauge Inspection", actual_value: "All 6 Points Verified OK", status: "Pass", remarks: "Legible markings" },
        { id: "cp-7", parameter: "PAINTING (OP-010 RECEIVING INSPECTION)", specification: "1. Ensure Black dip painting 2. No paint peel off, no paint overflow & damages (Applicable Part: 45111/45151-55T00)", check_method: "Visual Dip Inspection", actual_value: "Black Dip Uniform, No Peel Off", status: "Pass", remarks: "Dip finish OK" },
      ]);
    }
  }, [auditId]);

  // Notes & Photos State
  const [inspectorNotes, setInspectorNotes] = useState("");
  const [imageFiles, setImageFiles] = useState<(string | null)[]>([null, null, null]);
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // E-Signature Image Upload & Employee ID Authentication State
  const [authEmpId, setAuthEmpId] = useState(profile?.employee_number || "688079");
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [sigDragOver, setSigDragOver] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Authenticate Employee ID and auto-load ONLY their registered e-signature
  const handleAuthenticateSignature = useCallback((empIdToAuth: string) => {
    const cleanId = empIdToAuth.trim();
    if (!cleanId) {
      toast.error("Please enter your Employee ID to authenticate.");
      return;
    }
    const sigData = authenticateAndGetSignature(cleanId);
    if (sigData && sigData.signature_url) {
      setSignatureImage(sigData.signature_url);
      setSignedAt(format(new Date(), "dd MMM yyyy, hh:mm a"));
      toast.success(`Authenticated: Loaded signature for ${sigData.employee_name} (Emp #${sigData.employee_number})!`);
    } else {
      setSignatureImage(null);
      setSignedAt(null);
      toast.error(`Employee ID #${cleanId} not found in registered roster.`);
    }
  }, []);

  // Sync authEmpId when logged in profile changes (does NOT auto-load signature until button clicked)
  React.useEffect(() => {
    const currentEmp = profile?.employee_number || "688079";
    setAuthEmpId(currentEmp);
  }, [profile?.employee_number]);

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

  // Auto-attach authenticated E-signature image for logged in employee
  React.useEffect(() => {
    if (!signatureImage) {
      const empNum = profile?.employee_number || "1002";
      const authMember = authenticateAndGetSignature(empNum);
      if (authMember && authMember.signature_url) {
        setSignatureImage(authMember.signature_url);
        setSignedAt(format(new Date(), "PPpp"));
      }
    }
  }, [profile?.employee_number]);

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

  const handleCheckMethodChange = (id: string, check_method: string) => {
    setCheckpoints((prev) => prev.map((cp) => (cp.id === id ? { ...cp, check_method } : cp)));
  };

  const handleRemarksChange = (id: string, remarks: string) => {
    setCheckpoints((prev) => prev.map((cp) => (cp.id === id ? { ...cp, remarks } : cp)));
  };

  const handleToggleStatus = (id: string, status: "Pass" | "Fail") => {
    setCheckpoints((prev) => prev.map((cp) => (cp.id === id ? { ...cp, status } : cp)));
  };

  const addCheckpointRow = () => {
    setCheckpoints((prev) => [
      ...prev,
      { id: `cp-${Date.now()}`, parameter: "", specification: "", check_method: "Visual", actual_value: "", status: "Pass", remarks: "" },
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

    // Record submitted audit metadata for admin review (Part No, Part Name, Employee Name, Submission Date)
    const now = new Date();
    const formattedDate = format(now, "dd MMM yyyy, hh:mm a");
    recordSubmittedAudit({
      audit_code: auditId.startsWith("AUD") ? auditId : `AUD-${auditId}`,
      part_no: partNo || "PN-88402-A",
      part_name: partName || "Quality Inspection Part",
      employee_name: profile?.full_name || "SILAMBARASAN S",
      employee_number: profile?.employee_number || "688079",
      department: profile?.department || "Machining Line 1",
      submitted_date: now.toISOString(),
      formatted_submitted_date: formattedDate,
      status: "Under Review",
      checkpoints_count: checkpoints.length,
      failing_count: checkpoints.filter((cp) => cp.status === "Fail").length,
    });

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_excel_tasks_v8");
      let tasks = stored ? JSON.parse(stored) : [];
      let found = false;
      tasks = tasks.map((t: any) => {
        if (t.id === auditId || t.audit_code === auditId) {
          found = true;
          return { ...t, status: "Under Review" };
        }
        return t;
      });
      if (!found) {
        tasks.push({
          id: auditId,
          audit_code: auditId.startsWith("AUD") ? auditId : `AUD-${auditId}`,
          title: partName || `Submitted Inspection (${auditId})`,
          audit_type: "Product",
          area: profile?.department || "Quality Inspection",
          assigned_to_employee_number: profile?.employee_number || "688079",
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          due_date: new Date().toISOString().split("T")[0],
          status: "Under Review",
        });
      }
      localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
      window.dispatchEvent(new Event("excel_tasks_updated"));
    }

    toast.success("Audit inspection report saved & submitted for Admin Review! Status updated to Under Review.");
    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 1200);
  };

  // Raise Deviation (2-Page Deviation Report Workflow)
  const handleRaiseDeviation = () => {
    const failed = checkpoints.filter((cp) => cp.status === "Fail");
    if (failed.length === 0) return;

    const desc = failed
      .map((cp) => `${cp.parameter || "Parameter"} (Spec: ${cp.specification || "N/A"}, Got: ${cp.actual_value || "N/A"})`)
      .join(" | ");

    const prefill = {
      audit_id: auditId,
      title: `Audit ${auditId} Deviation — ${partName}`,
      observed_condition: desc,
      location: `Audit ${auditId} — ${customer}`,
      severity: "High" as const,
      assigned_emp: profile?.employee_number || "688079",
      segregated_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_deviation_prefill", JSON.stringify(prefill));

      const stored = localStorage.getItem("sakthi_excel_tasks_v8");
      if (stored) {
        try {
          let tasks = JSON.parse(stored);
          tasks = tasks.map((t: any) => {
            if (t.id === auditId || t.audit_code === auditId) {
              return { ...t, status: "Deviation" };
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
    toast.info("Navigating to 2-Page Deviation Report Format — Please complete Page 1 details.");
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

        {/* ── STEP 1 CONTENT: CHECKPOINTS & MEASUREMENTS (OFFICIAL REPORT FORMAT) ── */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Official Sakthi Auto Report Header (Matching PDF Layout) */}
            <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-orange-600">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sakthi Auto Quality Assurance</span>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">
                      AUDIT INSPECTION CHECK LIST CUM REPORT (MACHINING)
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-md bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                    QF/08/CQA-09, Rev.No: 02 dt 12.06.2026
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Audit Record ID: <strong className="font-mono text-slate-800">{auditId}</strong></p>
                </div>
              </div>

              {/* Header Fields Grid (As in PDF Header) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    CUSTOMER
                  </label>
                  <input
                    type="text"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="e.g. MSIL / STELLANTIS"
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    PART NAME
                  </label>
                  <input
                    type="text"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="e.g. KNUCKLE STEERING R/L"
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    PART NO. & REV
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={partNo}
                      onChange={(e) => setPartNo(e.target.value)}
                      placeholder="e.g. 45111 M 55TA0"
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={revNo}
                      onChange={(e) => setRevNo(e.target.value)}
                      title="Revision Mark"
                      className="w-12 text-center rounded-md border border-slate-300 bg-white px-1 py-1.5 text-xs font-mono font-black text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    INSPECTOR / EMPLOYEE
                  </label>
                  <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 truncate">
                    {profile?.full_name || "SILAMBARASAN S"} (#{profile?.employee_number || "688079"})
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    DATE CODE
                  </label>
                  <input
                    type="text"
                    value={dateCode}
                    onChange={(e) => setDateCode(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    MACHINING TRACEABILITY
                  </label>
                  <input
                    type="text"
                    value={traceability}
                    onChange={(e) => setTraceability(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    INSPECTION DATE
                  </label>
                  <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800">
                    {format(new Date(), "dd MMM yyyy")}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    REPORT PAGE
                  </label>
                  <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 font-mono">
                    PAGE 1 OF 1
                  </div>
                </div>
              </div>
            </div>

            {/* Checkpoints & Specification Table */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-emerald-600" /> Quality Characteristics & Specification Checkpoints
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Format matching official Sakthi Auto Audit Inspection Report.
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
                <table className="w-full border-collapse text-left text-xs font-sans border border-slate-300">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-800 text-white font-mono text-[11px] uppercase tracking-wider">
                      <th className="p-2.5 w-12 text-center border-r border-slate-700">SL. NO.</th>
                      <th className="p-2.5 min-w-[220px] border-r border-slate-700">CHARACTERISTICS / PARAMETER</th>
                      <th className="p-2.5 w-56 border-r border-slate-700">SPECIFICATION</th>
                      <th className="p-2.5 w-40 border-r border-slate-700">CHECK METHOD</th>
                      <th className="p-2.5 w-44 border-r border-slate-700">OBSERVATION / VALUE</th>
                      <th className="p-2.5 text-center w-28 border-r border-slate-700">RESULT (OK / NOT OK)</th>
                      <th className="p-2.5 w-36 border-r border-slate-700">REMARKS</th>
                      <th className="p-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900 bg-white">
                    {checkpoints.map((cp, idx) => (
                      <tr key={cp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 text-center font-mono font-bold text-slate-600 border-r border-slate-200">
                          {idx + 1}
                        </td>

                        {/* CHARACTERISTICS / PARAMETER */}
                        <td className="p-2 border-r border-slate-200">
                          <textarea
                            rows={2}
                            value={cp.parameter}
                            onChange={(e) => handleParamChange(cp.id, e.target.value)}
                            placeholder="e.g. HARDNESS / MICROSTRUCTURE / APPEARANCE"
                            className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* SPECIFICATION */}
                        <td className="p-2 border-r border-slate-200">
                          <textarea
                            rows={2}
                            value={cp.specification}
                            onChange={(e) => handleSpecChange(cp.id, e.target.value)}
                            placeholder="e.g. 164 ~ 188 BHN / 500 MPa MIN"
                            className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* CHECK METHOD */}
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={cp.check_method ?? "Visual"}
                            onChange={(e) => handleCheckMethodChange(cp.id, e.target.value)}
                            placeholder="e.g. Visual / Gauge / Hardness Tester"
                            className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* OBSERVATION / MEASURED VALUE */}
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={cp.actual_value}
                            onChange={(e) => handleValueChange(cp.id, e.target.value)}
                            placeholder="e.g. 176 BHN / Conforms"
                            className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* RESULT (OK / NOT OK) */}
                        <td className="p-2 text-center border-r border-slate-200">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(cp.id, "Pass")}
                              className={`rounded px-2.5 py-1 text-[11px] font-black transition-all ${
                                cp.status === "Pass"
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(cp.id, "Fail")}
                              className={`rounded px-2.5 py-1 text-[11px] font-black transition-all ${
                                cp.status === "Fail"
                                  ? "bg-rose-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              NOT OK
                            </button>
                          </div>
                        </td>

                        {/* REMARKS */}
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={cp.remarks ?? ""}
                            onChange={(e) => handleRemarksChange(cp.id, e.target.value)}
                            placeholder="Remarks"
                            className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* ACTIONS */}
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
                        <td colSpan={8} className="p-6 text-center text-xs font-semibold text-slate-400">
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
                          onClick={() => fileInputRefs[index]?.current?.click()}
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

              {/* Employee ID Signature Authentication Panel */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-sky-600" /> Employee ID Signature Authentication
                  </span>
                  <span className="text-[11px] font-semibold text-sky-700">
                    Strict 1-to-1 ID Signature Verification
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={authEmpId}
                    onChange={(e) => setAuthEmpId(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter Employee ID (e.g. 688079)"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold font-mono text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAuthenticateSignature(authEmpId)}
                    className="rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sky-700 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Authenticate & Load Signature
                  </button>
                </div>
              </div>

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
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      🔒 E-Signature Verification Pending
                    </h4>
                    <p className="mt-1 text-xs text-amber-700 max-w-md">
                      Please verify your Employee ID above and click <strong>'Authenticate & Load Signature'</strong> to load and attach your registered electronic signature.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAuthenticateSignature(authEmpId)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" /> Authenticate & Load Signature
                  </button>
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
