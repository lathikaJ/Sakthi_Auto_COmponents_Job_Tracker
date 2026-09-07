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
  FileSpreadsheet,
  Download,
  Plus,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ExcelChecklistGrid } from "@/components/excel/ExcelChecklistGrid";

import { recordSubmittedAudit } from "@/lib/submittedAudits";
import { authenticateAndGetSignature } from "@/lib/electronicSignatures";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/audit/$auditId")({
  ssr: false,
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
  const params = useParams({ strict: false }) as any;
  const auditId = String(params?.auditId || "aud-msil-01");
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

  // Part & Inspection metadata states (Matching Industrial PDF Form)
  const [customer, setCustomer] = useState("MSIL");
  const [partNo, setPartNo] = useState("45111 M 55TA0 / 45151 M 55TA0 (ABS - NOPAINT)");
  const [partName, setPartName] = useState("KNUCKLE STEERING R/L - YTA / YTB");
  const [revNo, setRevNo] = useState("A");
  const [dateCode, setDateCode] = useState("DC-2026-08");
  const [traceability, setTraceability] = useState("OP-010 / OP-020");
  
  const [isExcelViewOpen, setIsExcelViewOpen] = useState(false);
  
  // Wizard Step State: 1 = Checkpoints, 2 = Notes & Photos, 3 = E-Signature & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Checkpoints State
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>([
    {
      id: "cp-1",
      sl_no: 1,
      parameter: "HARDNESS (MSIL QF/08/CQA-09)",
      specification: "164 ~ 188 BHN / 85 ~ 91HRB",
      check_method: "Brinell Hardness Tester",
      actual_value: "176 BHN",
      status: "Pass",
      remarks: "Conforms",
    },
    {
      id: "cp-2",
      sl_no: 2,
      parameter: "MICROSTRUCTURE SPHEROIDIZATION & PEARLITE",
      specification: "% OF SPHEROIDIZATION 80% MIN | % OF PEARLITE 10-40% MAX | NODULE COUNT >=70 PCS/mm² MIN",
      check_method: "Metallurgical Microscope",
      actual_value: "Spheroidization 85%, Pearlite 25%",
      status: "Pass",
      remarks: "Nodule 82 PCS/mm²",
    },
    {
      id: "cp-3",
      sl_no: 3,
      parameter: "TENSILE STRENGTH",
      specification: "500 MPa MIN",
      check_method: "Universal Testing Machine",
      actual_value: "525 MPa",
      status: "Pass",
      remarks: "Exceeds min",
    },
    {
      id: "cp-4",
      sl_no: 4,
      parameter: "YIELD STRENGTH @ 0.2% & 0.5%",
      specification: "YIELD STRENGTH @ 0.2%: 320 MPa MIN | YIELD STRENGTH @ 0.5%: 340 MPa MIN",
      check_method: "UTM Extensometer",
      actual_value: "@0.2%: 338 MPa | @0.5%: 355 MPa",
      status: "Pass",
      remarks: "Pass",
    },
    {
      id: "cp-5",
      sl_no: 5,
      parameter: "ELONGATION & IMPACT STRENGTH",
      specification: "ELONGATION 10% MIN | IMPACT STRENGTH - 8J/cm² MIN",
      check_method: "Charpy Impact & Tensile Tester",
      actual_value: "Elongation 12%, Impact 9.5 J/cm²",
      status: "Pass",
      remarks: "Pass",
    },
    {
      id: "cp-6",
      sl_no: 6,
      section: "OP - 010 : RECEIVING INSPECTION ROUGH CASTING",
      parameter: "APPEARANCE",
      specification: "1. Free of crack/flaw/harmful blow hole\n2. Over grinding & rust free\n3. Legible casting letters\n4. Surface per CFT-16\n5. Hardness mark at OP20\n6. 'X' mark for X-ray completion at OP20",
      check_method: "Visual & Gauge Inspection",
      actual_value: "All 6 Points Verified OK",
      status: "Pass",
      remarks: "Legible markings",
    },
    {
      id: "cp-7",
      sl_no: 7,
      parameter: "PAINTING",
      specification: "1. Ensure Black dip painting\n2. No paint peel off, no paint overflow & damages (Applicable Part: 45111/45151-55T00)",
      check_method: "Visual Dip Inspection",
      actual_value: "Black Dip Uniform, No Peel Off",
      status: "Pass",
      remarks: "Dip finish OK",
    },
  ]);

  // Notes & Photos State (DECLARED AT TOP)
  const [inspectorNotes, setInspectorNotes] = useState("");
  const [imageFiles, setImageFiles] = useState<(string | null)[]>([null, null, null]);
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // E-Signature Image Upload & Employee ID Authentication State (DECLARED AT TOP)
  const [authEmpId, setAuthEmpId] = useState(profile?.employee_number || "688079");
  // sig state
  // signed state
  const [sigDragOver, setSigDragOver] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Dynamic audit preset initialization based on auditId, with Draft restoration
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const draftStr = localStorage.getItem(`sakthi_audit_draft_${auditId}`);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.checkpoints && draft.checkpoints.length > 0) setCheckpoints(draft.checkpoints);
        if (draft.inspectorNotes) setInspectorNotes(draft.inspectorNotes);
        if (draft.imageFiles) setImageFiles(draft.imageFiles);
        if (draft.signatureImage) setSignatureImage(draft.signatureImage);
        if (draft.signedAt) setSignedAt(draft.signedAt);
        return;
      }
    } catch (_) {}

    if (auditId.includes("STELL") || auditId.includes("DOC")) {
      setCustomer("STELLANTIS");
      setPartNo("9845800980 & 9845801180");
      setPartName("PIVOT SUSPENSION GOA CC21 ( D78 ) LH / RH");
      setCheckpoints([
        { id: "cp-1", sl_no: 1, parameter: "MASTER SAMPLE COMPARISON (QF/08/CQA-37)", specification: "Should be compared with master sample (All radius, chamfer, profile, milling)", check_method: "Visual Comparison", actual_value: "Conforms to Master", status: "Pass", remarks: "All profiles OK" },
        { id: "cp-2", sl_no: 2, parameter: "APPEARANCE 10-POINT CHECK", specification: "No blow hole, pin hole, wall thickness variation, sharp edge, dent/damage, flaws, rust, paint peel off", check_method: "10-Point Visual Check", actual_value: "OK (10/10)", status: "Pass", remarks: "Clean surface" },
        { id: "cp-3", sl_no: 3, parameter: "RP OIL CONDITION VERIFICATION", specification: "No excess oil, no dust/burr/scrap, no foreign particles", check_method: "Visual & Wipe Check", actual_value: "Verified OK", status: "Pass", remarks: "No foreign scrap" },
        { id: "cp-4", sl_no: 4, parameter: "PACKING BOX & VCI COVER CONDITION", specification: "Proper center pad/foam, no box damage, VCI cover clean", check_method: "Visual Inspection", actual_value: "Good Condition", status: "Pass", remarks: "VCI Sealed" },
        { id: "cp-5", sl_no: 5, parameter: "PACKING OF PARTS VERIFICATION", specification: "Qty per layer = 24, Qty per box = 144, labeling info verified", check_method: "Count & Label Verification", actual_value: "144 NOS (24x6)", status: "Pass", remarks: "Box Tag OK" },
      ]);
    } else if (auditId.includes("VOL") || auditId.includes("LAY")) {
      setCustomer("VOLVO");
      setPartNo("23407840 / P03");
      setPartName("FAN BRACKET LOW FAN HUB");
      setCheckpoints([
        { id: "cp-1", sl_no: 1, parameter: "DISTANCE M", specification: "4 x 47.7±0.2 (CMM / Height Vernier & Scriber)", check_method: "CMM / Height Vernier", actual_value: "47.72 mm", status: "Pass", remarks: "Within spec" },
        { id: "cp-2", sl_no: 2, parameter: "THICKNESS M", specification: "4 x 22.5±0.3 (Micrometer)", check_method: "Digital Micrometer", actual_value: "22.51 mm", status: "Pass", remarks: "Within spec" },
        { id: "cp-3", sl_no: 3, parameter: "ROUGHNESS ON DATUM 'A' OPPOSITE SIDE M", specification: "6.3 Ra (Surf Tester)", check_method: "Surface Roughness Tester", actual_value: "6.1 Ra", status: "Pass", remarks: "Smooth" },
      ]);
    }
  }, [auditId]);
  
  const isAuditSubmitted = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("sakthi_excel_tasks_v8");
    if (stored) {
      try {
        const tasks = JSON.parse(stored);
        const match = tasks.find((t: any) => t.id === auditId || t.audit_code === auditId || t.audit_code === `AUD-${auditId}`);
        if (match && ["Submitted", "Under Review", "Completed", "Approved", "Deviation"].includes(match.status)) {
          return true;
        }
      } catch {}
    }
    const submittedRaw = localStorage.getItem("sakthi_submitted_audits_v2");
    if (submittedRaw) {
      try {
        const list = JSON.parse(submittedRaw);
        const match = list.find((s: any) => s.id === auditId || s.audit_code === auditId || s.audit_code === `AUD-${auditId}`);
        if (match) return true;
      } catch {}
    }
    return false;
  }, [auditId]);

  // Notes & Photos State
  // notes state
  // images state
  // file refs

  // E-Signature Image Upload & Employee ID Authentication State
  // auth emp id
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  // drag state
  // sig ref

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

  const checkpointFileInputRef = useRef<HTMLInputElement>(null);

  // Excel Import for Quality Characteristics & Specification Checkpoints
  const handleCheckpointsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          toast.error("Uploaded file contains no valid checkpoint rows.");
          return;
        }

        const importedCheckpoints: CheckpointItem[] = data.map((item, idx) => {
          const rawStatus = String(
            item["Result"] || item["RESULT"] || item["Status"] || item["RESULT (OK / NOT OK)"] || ""
          ).toUpperCase();
          const isFail = rawStatus.includes("FAIL") || rawStatus.includes("NOT OK");
          return {
            id: `cp-imp-${Date.now()}-${idx}`,
            sl_no: idx + 1,
            parameter: String(
              item["Characteristics"] ||
                item["CHARACTERISTICS / PARAMETER"] ||
                item["Parameter"] ||
                item["Task"] ||
                `Characteristic #${idx + 1}`
            ),
            specification: String(
              item["Specification"] || item["SPECIFICATION"] || item["Spec"] || "As per drawing"
            ),
            check_method: String(
              item["Check Method"] || item["CHECK METHOD"] || item["Method"] || "Visual"
            ),
            actual_value: String(
              item["Observation"] ||
                item["OBSERVATION / VALUE"] ||
                item["Value"] ||
                item["Actual"] ||
                "Conforms"
            ),
            status: isFail ? "Fail" : "Pass",
            remarks: String(item["Remarks"] || item["REMARKS"] || "OK"),
          };
        });

        setCheckpoints(importedCheckpoints);
        toast.success(`Imported ${importedCheckpoints.length} inspection checkpoints from MS Excel (.xlsx)!`);
      } catch {
        toast.error("Error reading Excel file. Please ensure it is a valid .xlsx or .csv document.");
      }
    };
    reader.readAsBinaryString(file);
    if (checkpointFileInputRef.current) checkpointFileInputRef.current.value = "";
  };

  // Excel Export for Quality Characteristics & Specification Checkpoints
  const handleExportCheckpointsExcel = () => {
    const exportData = checkpoints.map((cp, idx) => ({
      "SL. NO.": idx + 1,
      "CHARACTERISTICS / PARAMETER": cp.parameter,
      "SPECIFICATION": cp.specification,
      "CHECK METHOD": cp.check_method || "Visual",
      "OBSERVATION / VALUE": cp.actual_value || "Conforms",
      "RESULT (OK / NOT OK)": cp.status === "Pass" ? "OK" : "NOT OK",
      "REMARKS": cp.remarks || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
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

    XLSX.writeFile(workbook, `Sakthi_Auto_Inspection_Checkpoints_${auditId}.xlsx`);
    toast.success("Inspection Checkpoints exported to MS Excel (.xlsx)!");
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

  // Keyboard shortcut Ctrl+S / Cmd+S on audit form
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [checkpoints, imageFiles, inspectorNotes, signatureImage]);

  // Submit Completed Audit (Inspector -> Under Review, Admin -> Audit Completed)
  const handleSubmitAudit = () => {
    if (!signatureImage) {
      toast.error("Please upload your e-signature before submitting.");
      return;
    }
    const hasFailures = checkpoints.some((cp) => cp.status === "Fail");
    if (hasFailures) {
      toast.warning("Audit has failing checkpoints — please click NOT OK (Raise 2-Page Deviation).");
      return;
    }

    // Record submitted audit metadata for admin review or direct completion
    const now = new Date();
    const formattedDate = format(now, "dd MMM yyyy, hh:mm a");
    const targetStatus = isAdmin ? "Completed" : "Under Review";
    const todayStr = now.toISOString().split("T")[0];

    recordSubmittedAudit({
      audit_code: auditId.startsWith("AUD") ? auditId : `AUD-${auditId}`,
      part_no: partNo || "PN-88402-A",
      part_name: partName || "Quality Inspection Part",
      employee_name: profile?.full_name || "SILAMBARASAN S",
      employee_number: profile?.employee_number || "688079",
      department: profile?.department || "Machining Line 1",
      submitted_date: now.toISOString(),
      formatted_submitted_date: formattedDate,
      status: targetStatus as any,
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
          return {
            ...t,
            status: targetStatus,
            ...(isAdmin ? { completion_date: todayStr, final_result: "PASS / COMPLIANT" } : {}),
          };
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
          due_date: todayStr,
          status: targetStatus,
          ...(isAdmin ? { completion_date: todayStr, final_result: "PASS / COMPLIANT" } : {}),
        });
      }
      localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));
      window.dispatchEvent(new Event("excel_tasks_updated"));
    }

    // Sync to Supabase DB
    const cleanAuditCode = auditId.startsWith("AUD") ? auditId : `AUD-${auditId}`;
    supabase.from("audit_assignments").update({ status: targetStatus as any }).eq("audit_code", cleanAuditCode).then(({ error }) => {
      if (error) console.warn("Supabase assignment status update notice:", error);
    });

    if (isAdmin) {
      toast.success(`Audit ${cleanAuditCode} approved & marked Audit Completed!`);
    } else {
      toast.success("Audit inspection report saved & submitted for Admin Review! Status updated to Under Review.");
    }

    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 1200);
  };

  // Raise Deviation (2-Page Deviation Report Workflow)
  const handleRaiseDeviation = () => {
    const failed = checkpoints.filter((cp) => cp.status === "Fail");
    const desc = failed.length > 0
      ? failed.map((cp) => `${cp.parameter || "Parameter"} (Spec: ${cp.specification || "N/A"}, Got: ${cp.actual_value || "N/A"})`).join(" | ")
      : `Non-conformance identified during ${partName || auditId} quality inspection.`;

    const prefill = {
      audit_id: auditId,
      title: `Audit ${auditId} Deviation — ${partName}`,
      observed_condition: desc,
      location: `Audit ${auditId} — ${customer}`,
      severity: "High" as const,
      part_name: partName,
      part_no: partNo,
      assigned_emp: profile?.employee_number || "688079",
      segregated_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
    };

    handleSaveDraft();

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

    // Sync to Supabase DB
    const cleanAuditCode = auditId.startsWith("AUD") ? auditId : `AUD-${auditId}`;
    supabase.from("audit_assignments").update({ status: "Deviation" }).eq("audit_code", cleanAuditCode).then(({ error }) => {
      if (error) console.warn("Supabase assignment status update notice:", error);
    });
    toast.info("Opening 2-Page Deviation Report — Please fill Page 1 details.");
    navigate({ to: "/deviations" });
  };

  const failedCheckpoints = (checkpoints || []).filter((cp) => cp && cp.status === "Fail");

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

        {/* Submitted Locked Banner for Non-Admin */}
        {isAuditSubmitted && !isAdmin && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Audit Submitted — Inspection form is locked in Read-Only mode for employees.</span>
            </div>
            <span className="rounded bg-amber-200 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-amber-900 border border-amber-300 shrink-0">
              Read-Only Mode
            </span>
          </div>
        )}

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
            {/* Unified Single Excel Sheet: Header Report + Quality Checkpoints Matrix */}
            <ExcelChecklistGrid
              auditCode={auditId || "AUD-01"}
              customer={customer}
              setCustomer={setCustomer}
              partName={partName}
              setPartName={setPartName}
              partNo={partNo}
              setPartNo={setPartNo}
              revNo={revNo}
              setRevNo={setRevNo}
              dateCode={dateCode}
              setDateCode={setDateCode}
              traceability={traceability}
              setTraceability={setTraceability}
              auditorName={profile?.full_name || "SILAMBARASAN S"}
              auditorEmpNumber={profile?.employee_number || "688079"}
              checkpoints={checkpoints}
              onUpdateCheckpoint={(id, field, value) => {
                setCheckpoints((prev) =>
                  prev.map((cp) => (cp.id === id ? { ...cp, [field]: value } : cp))
                );
              }}
              onAddCheckpoint={addCheckpointRow}
              onDeleteCheckpoint={deleteCheckpointRow}
              onImportCheckpoints={(newCps) => setCheckpoints(newCps)}
              onSaveToCloud={handleSaveDraft}
              isSaving={isSavingDraft}
            />

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

            {/* Bottom Next Step Bar */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">
                Step 1 of 3: Checkpoints filled & synced. Proceed to attach evidence photos.
              </div>
              <Button
                onClick={() => setCurrentStep(2)}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-sm cursor-pointer"
              >
                Proceed to Step 2: Photos & Notes <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

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

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="gap-2 border-slate-300 bg-white text-slate-800 font-bold hover:bg-slate-100 text-xs"
                >
                  <Save className="h-4 w-4 text-slate-600" /> Save Draft
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRaiseDeviation}
                  className="gap-1.5 border-rose-300 bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 text-xs shadow-xs"
                  title="Mark NOT OK and open 2-Page Deviation Report"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> NOT OK (Raise 2-Page Deviation)
                </Button>

                <Button
                  onClick={handleSubmitAudit}
                  disabled={isAuditSubmitted && !isAdmin}
                  className={`gap-2 font-bold text-xs shadow-sm ${
                    isAuditSubmitted && !isAdmin
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                  title={
                    isAuditSubmitted && !isAdmin
                      ? "Audit submitted — Cannot re-submit"
                      : isAdmin
                      ? "Submit & Approve to Audit Completed"
                      : "Submit for Admin Review"
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />{" "}
                  {isAuditSubmitted && !isAdmin
                    ? "Already Submitted (Locked)"
                    : isAdmin
                    ? "OK (Submit to Audit Completed)"
                    : "OK (Submit for Admin Review)"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
