import React, { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Filter,
  Building2,
  X,
  FileText,
  ShieldCheck,
  Upload,
  Printer,
  AlertCircle,
  Download,
  Save,
  FileEdit,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { authenticateAndGetSignature } from "@/lib/electronicSignatures";
import { updateSubmittedAuditStatus } from "@/lib/submittedAudits";

export const Route = createFileRoute("/_authenticated/deviations")({
  component: DeviationsPage,
});

export type DeviationObservationItem = {
  sl_no: number;
  specification: string;
  obs1: string;
  obs2: string;
  obs3: string;
  obs4: string;
  obs5: string;
  obs6: string;
  remarks: string;
};

export type DeviationCapaItem = {
  date: string;
  part_name: string;
  part_no: string;
  non_conformance: string;
  root_cause: string;
  corrective_action: string;
};

export type DeviationItem = {
  id: string;
  audit_id?: string;
  dev_code: string;
  description: string; // Deviation Title / Summary
  observed_condition: string;
  location_operation: string; // Location / Plant / Line
  employee_number: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "open" | "page1_submitted" | "page1_approved" | "page2_submitted" | "under_review" | "closed";
  is_draft?: boolean; // Draft status for resuming work tomorrow
  created_at: string;

  // Page 1 Specific Fields (Matching Image 1: DEVIATION REPORT QF/08/CQA-55)
  report_date: string;
  from_dept: string;
  to_dept: string;
  part_name: string;
  part_number: string;
  stage: "INPROCESS" | "FINISHED" | "DEVELOPMENT";
  observations: DeviationObservationItem[];
  cc: string;
  doc_code: string; // "QF/08/CQA-55"
  doc_date: string; // "25.12.2015"
  inspected_by: string;
  inspected_by_signature?: string;
  approved_by: string;
  approved_by_signature?: string;

  // Page 1 Admin Approval
  page1_approved?: boolean;
  page1_approved_by?: string;
  page1_approved_at?: string;

  // Page 2 Specific Fields (Matching Image 2: RCA, CAPA & QUARANTINE DETAILS)
  page2_submitted?: boolean;
  capa_items: DeviationCapaItem[];
  quarantine_segregated_qty: string;
  quarantine_ok_qty: string;
  quarantine_not_ok_qty: string;
  quarantine_segregated_by: string;
  quarantine_segregated_by_signature?: string;
  quarantine_approved_by: string;
  quarantine_approved_by_signature?: string;
  page2_attachment_name?: string;
  page2_submitted_at?: string;

  // Legacy fallback compatibility
  segregated_qty?: string;
  ok_qty?: string;
  ng_qty?: string;
  root_cause?: string;
  corrective_action?: string;
  recommended_action?: string;
  segregated_by?: string;
  employee_signature?: string;
  report_attached?: boolean;

  // Dual Approval
  both_approved?: boolean;
  final_approved_by?: string;
};

const getTodayDateStr = (): string => {
  return new Date().toISOString().split("T")[0] || new Date().toISOString();
};

const DEFAULT_OBSERVATIONS: DeviationObservationItem[] = [
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

const DEFAULT_CAPA_ITEMS: DeviationCapaItem[] = [
  {
    date: getTodayDateStr(),
    part_name: "STEERING KNUCKLE",
    part_no: "45110-M86R00",
    non_conformance: "Bore Oversize (+0.01 ~ 0.02mm) observed in sample #5 & #6",
    root_cause: "Insert tip wear out during long run machining & coolant jet misaligned",
    corrective_action: "Replaced tool insert, realigned coolant jet nozzle, and 100% re-inspected lot.",
  },
];

function DeviationsPage() {
  const { profile, isAdmin } = useAuth();
  const [deviations, setDeviations] = useState<DeviationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<1 | 2>(1); // Page 1 vs Page 2
  const [editingDevId, setEditingDevId] = useState<string | null>(null);
  const [viewReportDev, setViewReportDev] = useState<DeviationItem | null>(null);

  const inspectedSigInputRef = useRef<HTMLInputElement>(null);
  const approvedSigInputRef = useRef<HTMLInputElement>(null);
  const segSigInputRef = useRef<HTMLInputElement>(null);
  const quarantineAppSigInputRef = useRef<HTMLInputElement>(null);
  const page2FileInputRef = useRef<HTMLInputElement>(null);

  // Form State (Page 1 & Page 2 matching Image 1 and Image 2)
  const [formData, setFormData] = useState<{
    audit_id: string;
    title: string;
    location: string;
    severity: "Low" | "Medium" | "High" | "Critical";
    report_date: string;
    from_dept: string;
    to_dept: string;
    part_name: string;
    part_number: string;
    stage: "INPROCESS" | "FINISHED" | "DEVELOPMENT";
    observations: DeviationObservationItem[];
    cc: string;
    doc_code: string;
    doc_date: string;
    inspected_by: string;
    inspected_by_signature: string;
    approved_by: string;
    approved_by_signature: string;

    capa_items: DeviationCapaItem[];
    quarantine_segregated_qty: string;
    quarantine_ok_qty: string;
    quarantine_not_ok_qty: string;
    quarantine_segregated_by: string;
    quarantine_segregated_by_signature: string;
    quarantine_approved_by: string;
    quarantine_approved_by_signature: string;
    page2_attachment_name: string;
  }>({
    audit_id: "",
    title: "Steering Knuckle Bore Oversize Non-Conformance",
    location: "Machine Shop Line 1 / Plant 2",
    severity: "High",
    report_date: getTodayDateStr(),
    from_dept: "QUALITY ASSURANCE / LINE 1",
    to_dept: "PRODUCTION & MANUFACTURING",
    part_name: "STEERING KNUCKLE",
    part_number: "45110-M86R00",
    stage: "INPROCESS",
    observations: DEFAULT_OBSERVATIONS,
    cc: "PLANT HEAD, QA MANAGER, PRODUCTION INCHARGE",
    doc_code: "QF/08/CQA-55",
    doc_date: "25.12.2015",
    inspected_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
    inspected_by_signature: "",
    approved_by: "KARTHIKEYAN C (690867)",
    approved_by_signature: "",

    capa_items: DEFAULT_CAPA_ITEMS,
    quarantine_segregated_qty: "100",
    quarantine_ok_qty: "95",
    quarantine_not_ok_qty: "5",
    quarantine_segregated_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
    quarantine_segregated_by_signature: "",
    quarantine_approved_by: "KARTHIKEYAN C (690867)",
    quarantine_approved_by_signature: "",
    page2_attachment_name: "",
  });

  // Auto-save active uncommitted draft while editing in modal wizard
  useEffect(() => {
    if (isModalOpen && formData && typeof window !== "undefined") {
      localStorage.setItem("sakthi_active_deviation_draft", JSON.stringify(formData));
    }
  }, [isModalOpen, formData]);

  // Load registered signatures automatically if available
  useEffect(() => {
    const currentEmp = profile?.employee_number || "688079";
    const sigObj = authenticateAndGetSignature(currentEmp);
    if (sigObj?.signature_url) {
      setFormData((prev) => ({
        ...prev,
        inspected_by_signature: sigObj.signature_url,
        approved_by_signature: sigObj.signature_url,
        quarantine_segregated_by_signature: sigObj.signature_url,
        quarantine_approved_by_signature: sigObj.signature_url,
      }));
    }
  }, [profile?.employee_number]);

  // Load stored deviations with backward compatibility for old items
  const loadDeviations = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_deviations");
      if (stored) {
        try {
          const parsed: any[] = JSON.parse(stored);
          const today = getTodayDateStr();
          const live: DeviationItem[] = parsed
            .filter((d) => !d.id?.startsWith("demo-dev-"))
            .map((d): DeviationItem => {
              const obsList: DeviationObservationItem[] = Array.isArray(d.observations) && d.observations.length > 0
                ? d.observations.map((obs: any, index: number): DeviationObservationItem => ({
                    sl_no: typeof obs?.sl_no === "number" ? obs.sl_no : index + 1,
                    specification: String(obs?.specification || ""),
                    obs1: String(obs?.obs1 || ""),
                    obs2: String(obs?.obs2 || ""),
                    obs3: String(obs?.obs3 || ""),
                    obs4: String(obs?.obs4 || ""),
                    obs5: String(obs?.obs5 || ""),
                    obs6: String(obs?.obs6 || ""),
                    remarks: String(obs?.remarks || ""),
                  }))
                : DEFAULT_OBSERVATIONS;

              const capaList: DeviationCapaItem[] = Array.isArray(d.capa_items) && d.capa_items.length > 0
                ? d.capa_items.map((item: any): DeviationCapaItem => ({
                    date: String(item?.date || d.created_at || today),
                    part_name: String(item?.part_name || d.part_name || "STEERING KNUCKLE"),
                    part_no: String(item?.part_no || d.part_number || "45110-M86R00"),
                    non_conformance: String(item?.non_conformance || d.observed_condition || d.description || ""),
                    root_cause: String(item?.root_cause || d.page2_root_cause || d.root_cause || ""),
                    corrective_action: String(item?.corrective_action || d.page2_corrective_action || d.corrective_action || ""),
                  }))
                : [
                    {
                      date: String(d.created_at || today),
                      part_name: String(d.part_name || "STEERING KNUCKLE"),
                      part_no: String(d.part_number || d.product_part_number || "45110-M86R00"),
                      non_conformance: String(d.observed_condition || d.description || "Bore Oversize (+0.01~0.02mm)"),
                      root_cause: String(d.page2_root_cause || d.root_cause || "Insert tip wear out during long run machining"),
                      corrective_action: String(d.page2_corrective_action || d.corrective_action || "Replaced tool insert and re-inspected lot."),
                    },
                  ];

              return {
                id: String(d.id || `dev-${Date.now()}`),
                audit_id: d.audit_id || "",
                dev_code: String(d.dev_code || `DEV-2026-${Math.floor(100 + Math.random() * 900)}`),
                description: String(d.description || d.part_name || "Plant Non-Conformance"),
                observed_condition: String(d.observed_condition || d.root_cause || "Non-conformance identified during process audit."),
                location_operation: String(d.location_operation || d.department || "Machine Shop - Line 1"),
                employee_number: String(d.employee_number || "688079"),
                severity: (d.severity || "High") as "Low" | "Medium" | "High" | "Critical",
                status: (d.status || "page1_submitted") as any,
                is_draft: Boolean(d.is_draft),
                created_at: String(d.created_at || today),

                report_date: String(d.report_date || d.created_at || today),
                from_dept: String(d.from_dept || "QUALITY ASSURANCE"),
                to_dept: String(d.to_dept || "PRODUCTION"),
                part_name: String(d.part_name || "STEERING KNUCKLE"),
                part_number: String(d.part_number || d.product_part_number || "45110-M86R00"),
                stage: (d.stage || "INPROCESS") as "INPROCESS" | "FINISHED" | "DEVELOPMENT",
                observations: obsList,
                cc: String(d.cc || "PLANT HEAD, QA MANAGER, PRODUCTION INCHARGE"),
                doc_code: String(d.doc_code || "QF/08/CQA-55"),
                doc_date: String(d.doc_date || "25.12.2015"),
                inspected_by: String(d.inspected_by || d.segregated_by || "SILAMBARASAN S (688079)"),
                inspected_by_signature: d.inspected_by_signature || d.employee_signature || "",
                approved_by: String(d.approved_by || "KARTHIKEYAN C (690867)"),
                approved_by_signature: d.approved_by_signature || "",

                page1_approved: Boolean(d.page1_approved),
                page1_approved_by: String(d.page1_approved_by || ""),
                page1_approved_at: String(d.page1_approved_at || ""),

                page2_submitted: Boolean(d.page2_submitted),
                capa_items: capaList,
                quarantine_segregated_qty: String(d.quarantine_segregated_qty || d.segregated_qty || "100"),
                quarantine_ok_qty: String(d.quarantine_ok_qty || d.ok_qty || "95"),
                quarantine_not_ok_qty: String(d.quarantine_not_ok_qty || d.ng_qty || "5"),
                quarantine_segregated_by: String(d.quarantine_segregated_by || d.segregated_by || "SILAMBARASAN S (688079)"),
                quarantine_segregated_by_signature: d.quarantine_segregated_by_signature || d.employee_signature || "",
                quarantine_approved_by: String(d.quarantine_approved_by || d.approved_by || "KARTHIKEYAN C (690867)"),
                quarantine_approved_by_signature: d.quarantine_approved_by_signature || d.approved_by_signature || "",
                page2_attachment_name: String(d.page2_attachment_name || ""),
                page2_submitted_at: String(d.page2_submitted_at || ""),

                both_approved: Boolean(d.both_approved),
                final_approved_by: String(d.final_approved_by || ""),
              };
            });

          setDeviations(live);
          return;
        } catch {
          // Fall through
        }
      }
    }
    setDeviations([]);
  };

  useEffect(() => {
    loadDeviations();
    const handleUpdate = () => loadDeviations();
    window.addEventListener("sakthi_deviations_updated", handleUpdate);

    // Check pre-fill from audit execution (NOT OK clicked on inspection report)
    if (typeof window !== "undefined") {
      const prefillRaw = localStorage.getItem("sakthi_deviation_prefill");
      if (prefillRaw) {
        try {
          const prefill = JSON.parse(prefillRaw);
          setFormData((prev) => ({
            ...prev,
            audit_id: prefill.audit_id || "",
            title: prefill.title || "Audit Non-Conformance Deviation",
            part_name: prefill.part_name || prev.part_name,
            part_number: prefill.part_no || prev.part_number,
            location: prefill.location || "Audit Checkpoint",
            severity: prefill.severity || "High",
            inspected_by: prefill.segregated_by || prev.inspected_by,
          }));
          setEditingDevId(null);
          setActiveTab(1);
          setIsModalOpen(true);
          localStorage.removeItem("sakthi_deviation_prefill");
        } catch {
          // Ignore
        }
      }
    }

    return () => window.removeEventListener("sakthi_deviations_updated", handleUpdate);
  }, []);

  const saveDeviationsList = async (updatedList: DeviationItem[]) => {
    setDeviations(updatedList);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakthi_deviations", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("sakthi_deviations_updated"));
    }
  };

  // Quantity Validation Rule: Segregated Quantity = OK Quantity + NOT OK Quantity
  const numSeg = parseInt(formData.quarantine_segregated_qty || "0", 10);
  const numOK = parseInt(formData.quarantine_ok_qty || "0", 10);
  const numNotOK = parseInt(formData.quarantine_not_ok_qty || "0", 10);
  const isQtyValid = !isNaN(numSeg) && !isNaN(numOK) && !isNaN(numNotOK) && numSeg > 0 && (numOK + numNotOK === numSeg);

  // Form Page 1 Validation (Image 1)
  const isPage1Valid =
    formData.title.trim() !== "" &&
    formData.part_name.trim() !== "" &&
    formData.part_number.trim() !== "" &&
    formData.from_dept.trim() !== "" &&
    formData.to_dept.trim() !== "" &&
    formData.inspected_by.trim() !== "" &&
    formData.approved_by.trim() !== "" &&
    formData.observations.length > 0 &&
    formData.observations.some((obs) => obs.specification.trim() !== "");

  // Form Page 2 Validation (Image 2)
  const isPage2Valid =
    formData.capa_items.length > 0 &&
    formData.capa_items.some((item) => item.non_conformance.trim() !== "" && item.root_cause.trim() !== "") &&
    formData.quarantine_segregated_by.trim() !== "" &&
    formData.quarantine_approved_by.trim() !== "" &&
    isQtyValid;

  // Signature Upload Handlers
  const handleSignatureUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldKey: "inspected_by_signature" | "approved_by_signature" | "quarantine_segregated_by_signature" | "quarantine_approved_by_signature"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file for Signature.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setFormData((prev) => ({ ...prev, [fieldKey]: (evt.target?.result as string) || "" }));
        toast.success("E-Signature uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePage2FileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, page2_attachment_name: file.name }));
      toast.success(`Attached file: ${file.name}`);
    }
  };

  // Dynamic Row Handlers for Page 1 Observations Table
  const handleAddObservationRow = () => {
    setFormData((prev) => ({
      ...prev,
      observations: [
        ...prev.observations,
        {
          sl_no: prev.observations.length + 1,
          specification: "",
          obs1: "",
          obs2: "",
          obs3: "",
          obs4: "",
          obs5: "",
          obs6: "",
          remarks: "",
        },
      ],
    }));
  };

  const handleUpdateObservationRow = (index: number, key: keyof DeviationObservationItem, value: any) => {
    setFormData((prev) => {
      const updated: DeviationObservationItem[] = prev.observations.map((item, i) =>
        i === index ? ({ ...item, [key]: value } as DeviationObservationItem) : item
      );
      return { ...prev, observations: updated };
    });
  };

  const handleRemoveObservationRow = (index: number) => {
    setFormData((prev) => {
      const updated: DeviationObservationItem[] = prev.observations
        .filter((_, i) => i !== index)
        .map((obs, i) => ({ ...obs, sl_no: i + 1 }));
      return { ...prev, observations: updated };
    });
  };

  // Dynamic Row Handlers for Page 2 CAPA Table
  const handleAddCapaRow = () => {
    setFormData((prev) => ({
      ...prev,
      capa_items: [
        ...prev.capa_items,
        {
          date: getTodayDateStr(),
          part_name: prev.part_name || "",
          part_no: prev.part_number || "",
          non_conformance: "",
          root_cause: "",
          corrective_action: "",
        },
      ],
    }));
  };

  const handleUpdateCapaRow = (index: number, key: keyof DeviationCapaItem, value: string) => {
    setFormData((prev) => {
      const updated: DeviationCapaItem[] = prev.capa_items.map((item, i) =>
        i === index ? ({ ...item, [key]: value } as DeviationCapaItem) : item
      );
      return { ...prev, capa_items: updated };
    });
  };

  const handleRemoveCapaRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      capa_items: prev.capa_items.filter((_, i) => i !== index),
    }));
  };

  // Save Draft Function (Allows saving progress at any stage without blocking on missing fields)
  const handleSaveDraft = async () => {
    const today = getTodayDateStr();
    const existingDev = editingDevId ? deviations.find((d) => d.id === editingDevId) : null;
    const draftCode = existingDev?.dev_code || `DEV-DRAFT-${Math.floor(100 + Math.random() * 900)}`;

    const draftDev: DeviationItem = {
      id: editingDevId || `dev-draft-${Date.now()}`,
      audit_id: formData.audit_id || `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      dev_code: draftCode,
      description: formData.title || "Untitled Deviation Draft",
      observed_condition: formData.observations[0]?.specification || "Draft non-conformance observation",
      location_operation: formData.location || "Machine Shop - Line 1",
      employee_number: profile?.employee_number || "688079",
      severity: formData.severity,
      status: "open",
      is_draft: true,
      created_at: existingDev?.created_at || today,

      report_date: formData.report_date || today,
      from_dept: formData.from_dept,
      to_dept: formData.to_dept,
      part_name: formData.part_name || "STEERING KNUCKLE",
      part_number: formData.part_number || "45110-M86R00",
      stage: formData.stage,
      observations: formData.observations,
      cc: formData.cc,
      doc_code: formData.doc_code || "QF/08/CQA-55",
      doc_date: formData.doc_date || "25.12.2015",
      inspected_by: formData.inspected_by,
      inspected_by_signature: formData.inspected_by_signature,
      approved_by: formData.approved_by,
      approved_by_signature: formData.approved_by_signature,

      page1_approved: existingDev?.page1_approved || false,
      page2_submitted: existingDev?.page2_submitted || false,
      capa_items: formData.capa_items,
      quarantine_segregated_qty: formData.quarantine_segregated_qty,
      quarantine_ok_qty: formData.quarantine_ok_qty,
      quarantine_not_ok_qty: formData.quarantine_not_ok_qty,
      quarantine_segregated_by: formData.quarantine_segregated_by,
      quarantine_segregated_by_signature: formData.quarantine_segregated_by_signature,
      quarantine_approved_by: formData.quarantine_approved_by,
      quarantine_approved_by_signature: formData.quarantine_approved_by_signature,
      page2_attachment_name: formData.page2_attachment_name,
    };

    let updated: DeviationItem[];
    if (editingDevId && deviations.some((d) => d.id === editingDevId)) {
      updated = deviations.map((d) => (d.id === editingDevId ? draftDev : d));
    } else {
      updated = [draftDev, ...deviations];
    }

    await saveDeviationsList(updated);
    setIsModalOpen(false);
    toast.success(`Draft report ${draftCode} saved successfully! You can resume editing tomorrow or anytime.`);
  };

  // Submit Page 1 (Deviation Report Format QF/08/CQA-55)
  const handleSubmitPage1 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPage1Valid) {
      toast.error("Please complete all mandatory fields and specifications for Page 1.");
      return;
    }

    const today = getTodayDateStr();

    if (editingDevId) {
      // Update existing deviation record
      const updated: DeviationItem[] = deviations.map((d): DeviationItem => {
        if (d.id === editingDevId) {
          return {
            ...d,
            description: formData.title,
            location_operation: formData.location,
            severity: formData.severity,
            report_date: formData.report_date || today,
            from_dept: formData.from_dept,
            to_dept: formData.to_dept,
            part_name: formData.part_name,
            part_number: formData.part_number,
            stage: formData.stage,
            observations: formData.observations,
            cc: formData.cc,
            doc_code: formData.doc_code,
            doc_date: formData.doc_date,
            inspected_by: formData.inspected_by,
            inspected_by_signature: formData.inspected_by_signature || d.inspected_by_signature || "",
            approved_by: formData.approved_by,
            approved_by_signature: formData.approved_by_signature || d.approved_by_signature || "",
            status: "page1_submitted",
            is_draft: false, // Mark as submitted, no longer draft
          };
        }
        return d;
      });
      await saveDeviationsList(updated);
      setIsModalOpen(false);
      toast.success("Page 1 [Deviation Report Format QF/08/CQA-55] submitted successfully!");
    } else {
      // Create new deviation record (Status: page1_submitted)
      const newCode = `DEV-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newDev: DeviationItem = {
        id: `dev-${Date.now()}`,
        audit_id: formData.audit_id || `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        dev_code: newCode,
        description: formData.title,
        observed_condition: formData.observations[0]?.specification || "Non-conformance identified during process audit.",
        location_operation: formData.location,
        employee_number: profile?.employee_number || "688079",
        severity: formData.severity,
        status: "page1_submitted",
        is_draft: false,
        created_at: today,

        report_date: formData.report_date || today,
        from_dept: formData.from_dept,
        to_dept: formData.to_dept,
        part_name: formData.part_name,
        part_number: formData.part_number,
        stage: formData.stage,
        observations: formData.observations,
        cc: formData.cc,
        doc_code: formData.doc_code,
        doc_date: formData.doc_date,
        inspected_by: formData.inspected_by,
        inspected_by_signature: formData.inspected_by_signature || formData.approved_by_signature || "",
        approved_by: formData.approved_by,
        approved_by_signature: formData.approved_by_signature || "",

        page1_approved: false,
        page2_submitted: false,
        capa_items: formData.capa_items,
        quarantine_segregated_qty: formData.quarantine_segregated_qty,
        quarantine_ok_qty: formData.quarantine_ok_qty,
        quarantine_not_ok_qty: formData.quarantine_not_ok_qty,
        quarantine_segregated_by: formData.quarantine_segregated_by,
        quarantine_segregated_by_signature: formData.quarantine_segregated_by_signature || "",
        quarantine_approved_by: formData.quarantine_approved_by,
        quarantine_approved_by_signature: formData.quarantine_approved_by_signature || "",
      };

      const updated = [newDev, ...deviations];
      await saveDeviationsList(updated);
      setIsModalOpen(false);
      toast.success(`Page 1 [Deviation Report ${newCode}] submitted! Moves for Admin Page 1 approval.`);
    }
  };

  // Admin approves Page 1
  const handleAdminApprovePage1 = async (dev: DeviationItem) => {
    if (!isAdmin) {
      toast.error("Access Denied: Only Admin can approve Page 1 of Deviation Report.");
      return;
    }
    const adminSig = authenticateAndGetSignature("690867");
    const updated: DeviationItem[] = deviations.map((d): DeviationItem => {
      if (d.id === dev.id) {
        return {
          ...d,
          page1_approved: true,
          page1_approved_by: adminSig?.employee_name || "KARTHIKEYAN C (690867)",
          page1_approved_at: new Date().toISOString(),
          status: "page1_approved" as const,
        };
      }
      return d;
    });
    await saveDeviationsList(updated);
    toast.success(`Page 1 of Deviation ${dev.dev_code} Approved by Admin! User can now download Page 1 and fill Page 2.`);
  };

  // Submit Page 2 (RCA, CAPA & Quarantine Details - Image 2)
  const handleSubmitPage2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPage2Valid) {
      if (!isQtyValid) {
        toast.error(`Quarantine Quantity Error: Segregated Qty (${numSeg}) must equal OK Qty (${numOK}) + NOT OK Qty (${numNotOK}) = ${numOK + numNotOK}.`);
      } else {
        toast.error("Please complete all mandatory fields for Page 2 (RCA, CAPA & Quarantine Details).");
      }
      return;
    }

    if (!editingDevId) {
      toast.error("Please save Page 1 first before submitting Page 2.");
      return;
    }

    const currentDev = deviations.find((d) => d.id === editingDevId);
    if (!currentDev) return;

    const nowIso = new Date().toISOString();

    const updated: DeviationItem[] = deviations.map((d): DeviationItem => {
      if (d.id === editingDevId) {
        return {
          ...d,
          page2_submitted: true,
          capa_items: formData.capa_items,
          quarantine_segregated_qty: formData.quarantine_segregated_qty,
          quarantine_ok_qty: formData.quarantine_ok_qty,
          quarantine_not_ok_qty: formData.quarantine_not_ok_qty,
          quarantine_segregated_by: formData.quarantine_segregated_by,
          quarantine_segregated_by_signature: formData.quarantine_segregated_by_signature || "",
          quarantine_approved_by: formData.quarantine_approved_by,
          quarantine_approved_by_signature: formData.quarantine_approved_by_signature || "",
          page2_attachment_name: formData.page2_attachment_name || "RCA_CAPA_Report.pdf",
          page2_submitted_at: nowIso,
          status: "under_review" as const,
          is_draft: false,
        };
      }
      return d;
    });

    await saveDeviationsList(updated);

    // Update linked Inspection Audit in sakthi_submitted_audits_v2 to "Under Review"
    if (currentDev.audit_id) {
      updateSubmittedAuditStatus(currentDev.audit_id, "Under Review", "Page 2 Root Cause, CAPA & Quarantine details submitted. Under Admin review.");
    }

    setIsModalOpen(false);
    toast.success(`Page 2 (RCA, CAPA & Quarantine Details) submitted! Both Inspection Report and Deviation Report are now Under Review to Admin.`);
  };

  // Admin Dual Approval
  const handleAdminApproveBoth = async (dev: DeviationItem) => {
    if (!isAdmin) {
      toast.error("Access Denied: Only Admin can perform final dual approval.");
      return;
    }
    const adminSig = authenticateAndGetSignature("690867");

    const updatedDevs: DeviationItem[] = deviations.map((d): DeviationItem => {
      if (d.id === dev.id) {
        return {
          ...d,
          status: "closed" as const,
          both_approved: true,
          final_approved_by: adminSig?.employee_name || "KARTHIKEYAN C (690867)",
        };
      }
      return d;
    });
    await saveDeviationsList(updatedDevs);

    if (dev.audit_id) {
      updateSubmittedAuditStatus(dev.audit_id, "Completed", `Approved & Signed by Admin (${adminSig?.employee_name || "KARTHIKEYAN C"})`);
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakthi_excel_tasks_v8");
      if (stored) {
        try {
          let tasks = JSON.parse(stored);
          tasks = tasks.map((t: any) => {
            if (t.id === dev.audit_id || t.audit_code === dev.audit_id || t.audit_code === dev.dev_code.replace("DEV-", "AUD-")) {
              return {
                ...t,
                status: "Completed",
                completion_date: getTodayDateStr(),
                final_result: "PASS / COMPLIANT (DEVIATION RESOLVED)",
              };
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

    toast.success(`Both Reports Approved by Admin! Inspection report moved to 'Completed Audit'. Deviation report ${dev.dev_code} closed.`);
  };

  const openModalForNew = () => {
    setEditingDevId(null);
    setActiveTab(1);
    const today = getTodayDateStr();

    // Check if there is an uncommitted active draft stored locally
    let restoredDraft = null;
    if (typeof window !== "undefined") {
      const draftRaw = localStorage.getItem("sakthi_active_deviation_draft");
      if (draftRaw) {
        try {
          restoredDraft = JSON.parse(draftRaw);
        } catch {
          // Ignore
        }
      }
    }

    if (restoredDraft) {
      setFormData(restoredDraft);
      toast.info("Restored your previous active draft!");
    } else {
      setFormData({
        audit_id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        title: "Steering Knuckle Bore Oversize Non-Conformance",
        location: "Machine Shop Line 1 / Plant 2",
        severity: "High",
        report_date: today,
        from_dept: "QUALITY ASSURANCE / LINE 1",
        to_dept: "PRODUCTION & MANUFACTURING",
        part_name: "STEERING KNUCKLE",
        part_number: "45110-M86R00",
        stage: "INPROCESS",
        observations: DEFAULT_OBSERVATIONS,
        cc: "PLANT HEAD, QA MANAGER, PRODUCTION INCHARGE",
        doc_code: "QF/08/CQA-55",
        doc_date: "25.12.2015",
        inspected_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
        inspected_by_signature: "",
        approved_by: "KARTHIKEYAN C (690867)",
        approved_by_signature: "",

        capa_items: DEFAULT_CAPA_ITEMS,
        quarantine_segregated_qty: "100",
        quarantine_ok_qty: "95",
        quarantine_not_ok_qty: "5",
        quarantine_segregated_by: profile?.full_name ? `${profile.full_name} (${profile.employee_number})` : "SILAMBARASAN S (688079)",
        quarantine_segregated_by_signature: "",
        quarantine_approved_by: "KARTHIKEYAN C (690867)",
        quarantine_approved_by_signature: "",
        page2_attachment_name: "",
      });
    }
    setIsModalOpen(true);
  };

  const openModalForEdit = (dev: DeviationItem, initialTab: 1 | 2 = 1) => {
    setEditingDevId(dev.id);
    setActiveTab(initialTab);
    const today = getTodayDateStr();
    setFormData({
      audit_id: dev.audit_id || "",
      title: dev.description,
      location: dev.location_operation,
      severity: dev.severity,
      report_date: dev.report_date || dev.created_at || today,
      from_dept: dev.from_dept || "QUALITY ASSURANCE",
      to_dept: dev.to_dept || "PRODUCTION",
      part_name: dev.part_name || "STEERING KNUCKLE",
      part_number: dev.part_number || "45110-M86R00",
      stage: dev.stage || "INPROCESS",
      observations: dev.observations && dev.observations.length > 0 ? dev.observations : DEFAULT_OBSERVATIONS,
      cc: dev.cc || "PLANT HEAD, QA MANAGER, PRODUCTION INCHARGE",
      doc_code: dev.doc_code || "QF/08/CQA-55",
      doc_date: dev.doc_date || "25.12.2015",
      inspected_by: dev.inspected_by || dev.segregated_by || "SILAMBARASAN S (688079)",
      inspected_by_signature: dev.inspected_by_signature || dev.employee_signature || "",
      approved_by: dev.approved_by || "KARTHIKEYAN C (690867)",
      approved_by_signature: dev.approved_by_signature || "",

      capa_items: dev.capa_items && dev.capa_items.length > 0 ? dev.capa_items : DEFAULT_CAPA_ITEMS,
      quarantine_segregated_qty: dev.quarantine_segregated_qty || dev.segregated_qty || "100",
      quarantine_ok_qty: dev.quarantine_ok_qty || dev.ok_qty || "95",
      quarantine_not_ok_qty: dev.quarantine_not_ok_qty || dev.ng_qty || "5",
      quarantine_segregated_by: dev.quarantine_segregated_by || dev.segregated_by || "SILAMBARASAN S (688079)",
      quarantine_segregated_by_signature: dev.quarantine_segregated_by_signature || dev.employee_signature || "",
      quarantine_approved_by: dev.quarantine_approved_by || dev.approved_by || "KARTHIKEYAN C (690867)",
      quarantine_approved_by_signature: dev.quarantine_approved_by_signature || dev.approved_by_signature || "",
      page2_attachment_name: dev.page2_attachment_name || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteDeviation = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only Admin can delete deviation records.");
      return;
    }
    const updated = deviations.filter((d) => d.id !== id);
    await saveDeviationsList(updated);
    toast.info("Deviation record removed by Admin.");
  };

  const filteredDeviations = deviations.filter((d) => {
    if (statusFilter === "drafts") return d.is_draft || d.status === "open";
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.dev_code.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.part_name.toLowerCase().includes(q) ||
        d.part_number.toLowerCase().includes(q) ||
        d.location_operation.toLowerCase().includes(q) ||
        d.employee_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const draftsCount = deviations.filter((d) => d.is_draft || d.status === "open").length;
  const openCount = deviations.filter((d) => !d.is_draft && d.status === "page1_submitted").length;
  const page1ApprovedCount = deviations.filter((d) => d.status === "page1_approved" || d.page1_approved).length;
  const reviewCount = deviations.filter((d) => d.status === "under_review" || d.status === "page2_submitted").length;
  const closedCount = deviations.filter((d) => d.status === "closed" || d.both_approved).length;

  return (
    <AppShell
      title="Plant Deviation Tracker (2-Page CAPA Workflow)"
      description="Record non-conformances across official 2-page formats: Page 1 (Deviation Report QF/08/CQA-55) & Page 2 (RCA, CAPA & Quarantine Details) with multi-stage Admin approval & Save Draft support."
    >
      <div className="space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Sakthi Auto Plant Deviation Register (QF/08/CQA-55)
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              2-Page Deviation Format: Page 1 (Deviation Report) &rarr; Admin P1 Approval &rarr; Page 2 (RCA, CAPA & Quarantine Details) &rarr; Dual Approval. Supports <strong>Save Draft</strong> for resuming later.
            </p>
          </div>

          <Button
            onClick={openModalForNew}
            className="gap-2 bg-brand font-bold text-white hover:bg-brand-hover shadow-sm text-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create 2-Page Deviation Report
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Logged</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">{deviations.length}</div>
          </div>
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-xs">
            <div className="text-xs font-semibold text-amber-800 uppercase flex items-center gap-1">
              <Save className="h-3.5 w-3.5 text-amber-600" /> Saved Drafts
            </div>
            <div className="mt-1 text-2xl font-extrabold text-amber-900">{draftsCount}</div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-orange-700 uppercase flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> P1 Submitted
            </div>
            <div className="mt-1 text-2xl font-extrabold text-orange-900">{openCount}</div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-sky-700 uppercase flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> P2 Under Review
            </div>
            <div className="mt-1 text-2xl font-extrabold text-sky-900">{reviewCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
            <div className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Dual Approved
            </div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-900">{closedCount}</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-slate-500" />
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All ({deviations.length})
            </button>
            <button
              onClick={() => setStatusFilter("drafts")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "drafts" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300"
              }`}
            >
              Drafts ({draftsCount})
            </button>
            <button
              onClick={() => setStatusFilter("page1_submitted")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "page1_submitted" ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-800 hover:bg-orange-100"
              }`}
            >
              Page 1 Submitted ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter("page1_approved")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "page1_approved" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-800 hover:bg-sky-100"
              }`}
            >
              Page 1 Approved ({page1ApprovedCount})
            </button>
            <button
              onClick={() => setStatusFilter("under_review")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "under_review" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-800 hover:bg-purple-100"
              }`}
            >
              Both Under Review ({reviewCount})
            </button>
            <button
              onClick={() => setStatusFilter("closed")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === "closed" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Dual Approved ({closedCount})
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search deviations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-slate-300 pl-9 text-xs bg-white text-slate-900 font-medium"
            />
          </div>
        </div>

        {/* Deviations Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 font-mono text-[11px] uppercase text-slate-700">
                  <th className="p-3 w-28 font-bold">Dev Code</th>
                  <th className="p-3 min-w-[200px] font-bold">Part & Non-Conformance</th>
                  <th className="p-3 w-32 font-bold">Stage & Line</th>
                  <th className="p-3 w-28 font-bold">Segregated Qty</th>
                  <th className="p-3 w-32 font-bold">Page 1 Status</th>
                  <th className="p-3 w-32 font-bold">Page 2 Status</th>
                  <th className="p-3 w-44 font-bold text-center">Actions & Download</th>
                  {isAdmin && <th className="p-3 text-center w-16 font-bold">Delete</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {filteredDeviations.map((dev) => {
                  return (
                    <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-brand">{dev.dev_code}</td>
                      <td className="p-3 space-y-1">
                        <div className="font-bold text-slate-900 text-sm">{dev.part_name} ({dev.part_number})</div>
                        <div className="text-xs text-slate-600 font-medium line-clamp-1">
                          {dev.description}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-800 uppercase mr-1 border border-slate-300">
                          {dev.stage || "INPROCESS"}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {dev.location_operation}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {dev.quarantine_segregated_qty || dev.segregated_qty || "100"} PCS
                      </td>
                      <td className="p-3">
                        {dev.is_draft || dev.status === "open" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
                            <Clock className="h-3 w-3 text-amber-600" /> Draft Saved (In Progress)
                          </span>
                        ) : dev.page1_approved ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Page 1 Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800 border border-orange-300">
                            <Clock className="h-3 w-3" /> Page 1 Submitted
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {dev.both_approved || dev.status === "closed" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Dual Approved
                          </span>
                        ) : dev.page2_submitted || dev.status === "under_review" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 border border-purple-300">
                            <Clock className="h-3 w-3" /> Under Admin Review
                          </span>
                        ) : dev.page1_approved ? (
                          <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-300">
                            Ready for Page 2
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Awaiting Page 1 Approval</span>
                        )}
                      </td>
                      <td className="p-3 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Resume Draft Button */}
                          {(dev.is_draft || dev.status === "open") && (
                            <button
                              type="button"
                              onClick={() => openModalForEdit(dev, 1)}
                              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-amber-700 transition-colors cursor-pointer shadow-2xs"
                              title="Resume editing saved draft"
                            >
                              <FileEdit className="h-3 w-3" /> Resume Draft
                            </button>
                          )}

                          {/* View Official Format Report */}
                          {!dev.is_draft && (
                            <button
                              type="button"
                              onClick={() => setViewReportDev(dev)}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-extrabold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                            >
                              <FileText className="h-3 w-3 text-amber-600" /> View Report
                            </button>
                          )}

                          {/* Admin Approve Page 1 */}
                          {isAdmin && !dev.is_draft && !dev.page1_approved && (
                            <button
                              type="button"
                              onClick={() => handleAdminApprovePage1(dev)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Approve P1
                            </button>
                          )}

                          {/* Download Approved Page 1 */}
                          {dev.page1_approved && (
                            <button
                              type="button"
                              onClick={() => setViewReportDev(dev)}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Download Approved Deviation Report (Page 1 & 2)"
                            >
                              <Download className="h-3 w-3 text-emerald-600" /> Download P1/P2
                            </button>
                          )}

                          {/* Fill Page 2 */}
                          {dev.page1_approved && !dev.both_approved && dev.status !== "closed" && (
                            <button
                              type="button"
                              onClick={() => openModalForEdit(dev, 2)}
                              className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-sky-700 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Plus className="h-3 w-3" /> Fill Page 2
                            </button>
                          )}

                          {/* Admin Dual Approval */}
                          {isAdmin && dev.page2_submitted && !dev.both_approved && dev.status !== "closed" && (
                            <button
                              type="button"
                              onClick={() => handleAdminApproveBoth(dev)}
                              className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-purple-700 transition-colors cursor-pointer shadow-2xs"
                            >
                              <ShieldCheck className="h-3 w-3" /> Approve Both
                            </button>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            onClick={() => handleDeleteDeviation(dev.id)}
                            title="Delete Record (Admin Only)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredDeviations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm font-semibold text-slate-500">
                      No deviation records match your criteria. Click '+ Create 2-Page Deviation Report' to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: 2-PAGE DEVIATION REPORT WIZARD (MATCHING IMAGE 1 & IMAGE 2) WITH SAVE DRAFT SUPPORT */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-4xl my-8 rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500 p-2 text-white shadow-xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      SAKTHI AUTO DEVIATION REPORT WIZARD (QF/08/CQA-55)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                      Page 1: Deviation Report Format &rarr; Page 2: RCA, CAPA & Quarantine Details
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Page 1 vs Page 2 Tab Selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab(1)}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 1
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white font-extrabold">1</span>
                  Page 1: Deviation Report (QF/08/CQA-55)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(2)}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 2
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] text-white font-extrabold">2</span>
                  Page 2: RCA, CAPA & Quarantine Details
                </button>
              </div>

              {/* ── PAGE 1 CONTENT: DEVIATION REPORT FORMAT (IMAGE 1) ── */}
              {activeTab === 1 && (
                <form onSubmit={handleSubmitPage1} className="space-y-4 text-xs">
                  {/* DOCUMENT HEADER FIELDS */}
                  <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-black uppercase text-slate-800 text-[10px] mb-1">
                          DATE *
                        </label>
                        <Input
                          required
                          type="date"
                          value={formData.report_date}
                          onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                          className="bg-white border-slate-300 font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-black uppercase text-slate-800 text-[10px] mb-1">
                          FROM *
                        </label>
                        <Input
                          required
                          placeholder="e.g. QUALITY ASSURANCE / LINE 1"
                          value={formData.from_dept}
                          onChange={(e) => setFormData({ ...formData, from_dept: e.target.value })}
                          className="bg-white border-slate-300 font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-black uppercase text-slate-800 text-[10px] mb-1">
                          TO: *
                        </label>
                        <Input
                          required
                          placeholder="e.g. PRODUCTION / MACHINE SHOP"
                          value={formData.to_dept}
                          onChange={(e) => setFormData({ ...formData, to_dept: e.target.value })}
                          className="bg-white border-slate-300 font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-black uppercase text-slate-800 text-[10px] mb-1">
                          PART NAME *
                        </label>
                        <Input
                          required
                          placeholder="e.g. STEERING KNUCKLE"
                          value={formData.part_name}
                          onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                          className="bg-white border-slate-300 font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-black uppercase text-slate-800 text-[10px] mb-1">
                          PART NUMBER *
                        </label>
                        <Input
                          required
                          placeholder="e.g. 45110-M86R00"
                          value={formData.part_number}
                          onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                          className="bg-white border-slate-300 font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block font-black uppercase text-slate-800 text-[10px] mb-1">
                          DEVIATION TITLE / SUMMARY *
                        </label>
                        <Input
                          required
                          placeholder="e.g. Steering Knuckle Bore Oversize Non-Conformance"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="bg-white border-slate-300 font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-black uppercase text-slate-800 text-[10px] mb-1">
                          STAGE (INPROCESS / FINISHED / DEVELOPMENT) *
                        </label>
                        <div className="flex items-center gap-4 bg-white border border-slate-300 rounded-md p-2">
                          {(["INPROCESS", "FINISHED", "DEVELOPMENT"] as const).map((stg) => (
                            <label key={stg} className="flex items-center gap-1.5 cursor-pointer text-[11px] font-extrabold text-slate-800">
                              <input
                                type="radio"
                                name="stage"
                                value={stg}
                                checked={formData.stage === stg}
                                onChange={() => setFormData({ ...formData, stage: stg })}
                                className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                              <span>{stg}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OBSERVATION TABLE (IMAGE 1) */}
                  <div className="rounded-xl border border-slate-300 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase tracking-wider text-slate-900 text-xs">
                        OBSERVATION MATRIX TABLE (SAMPLE OBSERVATIONS 1..6)
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddObservationRow}
                        className="h-7 gap-1 text-[11px] font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Observation Row
                      </Button>
                    </div>

                    <div className="overflow-x-auto border border-slate-300 rounded-lg">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 uppercase">
                            <th className="p-1.5 w-12 border-r border-slate-300 text-center">SL. NO.</th>
                            <th className="p-1.5 min-w-[180px] border-r border-slate-300">SPECIFICATION</th>
                            <th colSpan={6} className="p-1 border-r border-slate-300 text-center bg-slate-200">
                              OBSERVATION (SAMPLES 1 TO 6)
                            </th>
                            <th className="p-1.5 min-w-[120px] border-r border-slate-300">REMARKS</th>
                            <th className="p-1 w-10 text-center">DEL</th>
                          </tr>
                          <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700 text-center">
                            <th className="border-r border-slate-300"></th>
                            <th className="border-r border-slate-300"></th>
                            <th className="p-1 w-12 border-r border-slate-300">1</th>
                            <th className="p-1 w-12 border-r border-slate-300">2</th>
                            <th className="p-1 w-12 border-r border-slate-300">3</th>
                            <th className="p-1 w-12 border-r border-slate-300">4</th>
                            <th className="p-1 w-12 border-r border-slate-300">5</th>
                            <th className="p-1 w-12 border-r border-slate-300">6</th>
                            <th className="border-r border-slate-300"></th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {formData.observations.map((obs, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-1.5 font-bold text-center border-r border-slate-300 bg-slate-50">{obs.sl_no}</td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={obs.specification}
                                  onChange={(e) => handleUpdateObservationRow(idx, "specification", e.target.value)}
                                  placeholder="e.g. Bore Dia Ø 62.00 +0.02/+0.05"
                                  className="h-7 text-[11px] font-medium border-slate-200"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={obs.obs1}
                                  onChange={(e) => handleUpdateObservationRow(idx, "obs1", e.target.value)}
                                  placeholder="62.05"
                                  className="h-7 text-[11px] font-mono text-center border-slate-200 p-0.5"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={obs.obs2}
                                  onChange={(e) => handleUpdateObservationRow(idx, "obs2", e.target.value)}
                                  placeholder="62.06"
                                  className="h-7 text-[11px] font-mono text-center border-slate-200 p-0.5"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={obs.obs3}
                                  onChange={(e) => handleUpdateObservationRow(idx, "obs3", e.target.value)}
                                  placeholder="62.06"
                                  className="h-7 text-[11px] font-mono text-center border-slate-200 p-0.5"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={obs.obs4}
                                  onChange={(e) => handleUpdateObservationRow(idx, "obs4", e.target.value)}
                                  placeholder="62.05"
                                  className="h-7 text-[11px] font-mono text-center border-slate-200 p-0.5"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={obs.obs5}
                                  onChange={(e) => handleUpdateObservationRow(idx, "obs5", e.target.value)}
                                  placeholder="62.07"
                                  className="h-7 text-[11px] font-mono text-center border-slate-200 p-0.5"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={obs.obs6}
                                  onChange={(e) => handleUpdateObservationRow(idx, "obs6", e.target.value)}
                                  placeholder="62.06"
                                  className="h-7 text-[11px] font-mono text-center border-slate-200 p-0.5"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={obs.remarks}
                                  onChange={(e) => handleUpdateObservationRow(idx, "remarks", e.target.value)}
                                  placeholder="Remarks"
                                  className="h-7 text-[11px] font-medium border-slate-200"
                                />
                              </td>
                              <td className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveObservationRow(idx)}
                                  disabled={formData.observations.length <= 1}
                                  className="text-rose-600 hover:text-rose-800 disabled:opacity-30 cursor-pointer p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CC & SIGNATURES SECTION */}
                  <div className="space-y-3">
                    <div>
                      <label className="block font-black uppercase text-slate-800 text-[10px] mb-1">
                        CC : (CARBON COPY TO DEPARTMENTS) *
                      </label>
                      <Input
                        required
                        value={formData.cc}
                        onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                        placeholder="e.g. PLANT HEAD, QA MANAGER, PRODUCTION INCHARGE"
                        className="bg-white border-slate-300 font-bold text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3">
                      {/* INSPECTED BY */}
                      <div className="space-y-2 border-r border-slate-200 pr-2">
                        <span className="font-black uppercase text-slate-800 text-[11px]">
                          INSPECTED BY *
                        </span>
                        <Input
                          required
                          value={formData.inspected_by}
                          onChange={(e) => setFormData({ ...formData, inspected_by: e.target.value })}
                          placeholder="Inspector Name"
                          className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                        />
                        <input
                          type="file"
                          ref={inspectedSigInputRef}
                          onChange={(e) => handleSignatureUpload(e, "inspected_by_signature")}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-600">Signature:</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => inspectedSigInputRef.current?.click()}
                            className="h-6 text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-1.5 cursor-pointer"
                          >
                            <Upload className="h-3 w-3 mr-1" /> Upload Signature
                          </Button>
                        </div>
                        {formData.inspected_by_signature ? (
                          <div className="rounded border border-slate-300 bg-white p-1 flex items-center gap-2">
                            <img src={formData.inspected_by_signature} alt="Inspected Signature" className="h-8 w-auto object-contain max-w-[140px]" />
                            <span className="text-[9px] text-emerald-700 font-bold">✓ Signed</span>
                          </div>
                        ) : (
                          <div className="h-8 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                            Signature Required
                          </div>
                        )}
                      </div>

                      {/* APPROVED BY */}
                      <div className="space-y-2 pl-1">
                        <span className="font-black uppercase text-slate-800 text-[11px]">
                          APPROVED BY *
                        </span>
                        <Input
                          required
                          value={formData.approved_by}
                          onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                          placeholder="Approved Name"
                          className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                        />
                        <input
                          type="file"
                          ref={approvedSigInputRef}
                          onChange={(e) => handleSignatureUpload(e, "approved_by_signature")}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-600">Signature:</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => approvedSigInputRef.current?.click()}
                            className="h-6 text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-1.5 cursor-pointer"
                          >
                            <Upload className="h-3 w-3 mr-1" /> Upload Signature
                          </Button>
                        </div>
                        {formData.approved_by_signature ? (
                          <div className="rounded border border-slate-300 bg-white p-1 flex items-center gap-2">
                            <img src={formData.approved_by_signature} alt="Approved Signature" className="h-8 w-auto object-contain max-w-[140px]" />
                            <span className="text-[9px] text-emerald-700 font-bold">✓ Verified</span>
                          </div>
                        ) : (
                          <div className="h-8 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                            E-Signature Required
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Document Footer Code Label */}
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 font-bold pt-1">
                    <span>DOCUMENT CODE: QF/08/CQA-55</span>
                    <span>EFFECTIVE DATE: 25.12.2015</span>
                  </div>

                  {/* Submit Page 1 Button Bar */}
                  <div className="border-t border-slate-300 pt-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Save as draft to resume tomorrow or submit to move for Admin approval.
                    </span>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        className="border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </Button>

                      {/* SAVE AS DRAFT BUTTON */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveDraft}
                        className="border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Save className="h-3.5 w-3.5 text-amber-600" /> Save Draft (Resume Tomorrow)
                      </Button>

                      <Button
                        type="submit"
                        disabled={!isPage1Valid}
                        className={`text-xs font-black text-white shadow-md transition-all ${
                          isPage1Valid
                            ? "bg-amber-600 hover:bg-amber-700 cursor-pointer"
                            : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        Save & Submit Page 1 (To Deviations Icon)
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* ── PAGE 2 CONTENT: RCA, CAPA & QUARANTINE DETAILS (IMAGE 2) ── */}
              {activeTab === 2 && (
                <form onSubmit={handleSubmitPage2} className="space-y-4 text-xs">
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 flex items-center justify-between text-sky-900">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-sky-600" />
                      Page 2: Root Cause, Corrective Action (CAPA) & Quarantine Details
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-sky-200 text-sky-900 px-2 py-0.5 rounded">
                      Page 2 of 2
                    </span>
                  </div>

                  {/* CAPA TABLE (IMAGE 2 TOP TABLE) */}
                  <div className="rounded-xl border border-slate-300 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase tracking-wider text-slate-900 text-xs">
                        NON-CONFORMANCE & CORRECTIVE ACTION LOG (IMAGE 2 FORMAT)
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCapaRow}
                        className="h-7 gap-1 text-[11px] font-bold border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Action Row
                      </Button>
                    </div>

                    <div className="overflow-x-auto border border-slate-300 rounded-lg">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 uppercase">
                            <th className="p-1.5 w-24 border-r border-slate-300">DATE</th>
                            <th className="p-1.5 w-32 border-r border-slate-300">PART NAME</th>
                            <th className="p-1.5 w-28 border-r border-slate-300">PART NO.</th>
                            <th className="p-1.5 min-w-[140px] border-r border-slate-300">NON CONFORMANCE DETAILS</th>
                            <th className="p-1.5 min-w-[140px] border-r border-slate-300">ROOT CAUSE</th>
                            <th className="p-1.5 min-w-[160px] border-r border-slate-300">CORRECTIVE ACTION</th>
                            <th className="p-1 w-10 text-center">DEL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {formData.capa_items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  type="date"
                                  value={item.date}
                                  onChange={(e) => handleUpdateCapaRow(idx, "date", e.target.value)}
                                  className="h-7 text-[10px] font-mono border-slate-200 p-1"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={item.part_name}
                                  onChange={(e) => handleUpdateCapaRow(idx, "part_name", e.target.value)}
                                  placeholder="Part Name"
                                  className="h-7 text-[11px] font-medium border-slate-200"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <Input
                                  value={item.part_no}
                                  onChange={(e) => handleUpdateCapaRow(idx, "part_no", e.target.value)}
                                  placeholder="Part No."
                                  className="h-7 text-[11px] font-medium border-slate-200"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <textarea
                                  rows={2}
                                  value={item.non_conformance}
                                  onChange={(e) => handleUpdateCapaRow(idx, "non_conformance", e.target.value)}
                                  placeholder="Non-conformance details..."
                                  className="w-full rounded border border-slate-200 p-1 text-[11px] font-medium"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <textarea
                                  rows={2}
                                  value={item.root_cause}
                                  onChange={(e) => handleUpdateCapaRow(idx, "root_cause", e.target.value)}
                                  placeholder="Root cause..."
                                  className="w-full rounded border border-slate-200 p-1 text-[11px] font-medium"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300">
                                <textarea
                                  rows={2}
                                  value={item.corrective_action}
                                  onChange={(e) => handleUpdateCapaRow(idx, "corrective_action", e.target.value)}
                                  placeholder="Corrective action..."
                                  className="w-full rounded border border-slate-200 p-1 text-[11px] font-medium"
                                />
                              </td>
                              <td className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCapaRow(idx)}
                                  disabled={formData.capa_items.length <= 1}
                                  className="text-rose-600 hover:text-rose-800 disabled:opacity-30 cursor-pointer p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* QUARANTINE DETAILS SECTION (IMAGE 2 BOTTOM SECTION) */}
                  <div className="rounded-xl border-2 border-slate-900 bg-slate-50 p-4 space-y-3">
                    <div className="font-black uppercase text-slate-900 text-xs border-b border-slate-900 pb-1.5 tracking-wider">
                      QUARANTINE DETAILS :
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-black uppercase text-slate-900 text-[10px] mb-1">
                          SEGREGATED QTY: *
                        </label>
                        <Input
                          required
                          type="number"
                          min={1}
                          value={formData.quarantine_segregated_qty}
                          onChange={(e) => setFormData({ ...formData, quarantine_segregated_qty: e.target.value })}
                          placeholder="100"
                          className="bg-white border-slate-400 font-mono font-black text-slate-900 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-black uppercase text-emerald-800 text-[10px] mb-1">
                          OK QTY: *
                        </label>
                        <Input
                          required
                          type="number"
                          min={0}
                          value={formData.quarantine_ok_qty}
                          onChange={(e) => setFormData({ ...formData, quarantine_ok_qty: e.target.value })}
                          placeholder="95"
                          className="bg-white border-emerald-400 font-mono font-black text-emerald-900 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-black uppercase text-rose-800 text-[10px] mb-1">
                          NOT OK QTY: *
                        </label>
                        <Input
                          required
                          type="number"
                          min={0}
                          value={formData.quarantine_not_ok_qty}
                          onChange={(e) => setFormData({ ...formData, quarantine_not_ok_qty: e.target.value })}
                          placeholder="5"
                          className="bg-white border-rose-400 font-mono font-black text-rose-900 text-sm"
                        />
                      </div>
                    </div>

                    {/* QUANTITY VALIDATION CHECK */}
                    <div className="rounded-lg border p-2 text-xs font-bold transition-all">
                      {isQtyValid ? (
                        <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md p-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>
                            Quarantine Quantity Valid: OK Qty ({numOK}) + NOT OK Qty ({numNotOK}) = Segregated Qty ({numSeg})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-800 bg-rose-50 border border-rose-300 rounded-md p-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>
                            Quarantine Quantity Error: Segregated Qty ({numSeg}) does not equal OK Qty ({numOK}) + NOT OK Qty ({numNotOK}) = {numOK + numNotOK}.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* QUARANTINE SIGNATURES (IMAGE 2) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-900 pt-3">
                      {/* SEGREGATED BY */}
                      <div className="space-y-2 border-r border-slate-300 pr-2">
                        <span className="font-black uppercase text-slate-900 text-[11px]">
                          SEGREGATED BY *
                        </span>
                        <Input
                          required
                          value={formData.quarantine_segregated_by}
                          onChange={(e) => setFormData({ ...formData, quarantine_segregated_by: e.target.value })}
                          placeholder="Employee Name"
                          className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                        />
                        <input
                          type="file"
                          ref={segSigInputRef}
                          onChange={(e) => handleSignatureUpload(e, "quarantine_segregated_by_signature")}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-600">Signature:</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => segSigInputRef.current?.click()}
                            className="h-6 text-[10px] font-bold text-sky-700 hover:bg-sky-100 px-1.5 cursor-pointer"
                          >
                            <Upload className="h-3 w-3 mr-1" /> Upload Signature
                          </Button>
                        </div>
                        {formData.quarantine_segregated_by_signature ? (
                          <div className="rounded border border-slate-300 bg-white p-1 flex items-center gap-2">
                            <img src={formData.quarantine_segregated_by_signature} alt="Segregated Signature" className="h-8 w-auto object-contain max-w-[140px]" />
                            <span className="text-[9px] text-emerald-700 font-bold">✓ Signed</span>
                          </div>
                        ) : (
                          <div className="h-8 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                            Signature Required
                          </div>
                        )}
                      </div>

                      {/* APPROVED BY */}
                      <div className="space-y-2 pl-1">
                        <span className="font-black uppercase text-slate-900 text-[11px]">
                          APPROVED BY *
                        </span>
                        <Input
                          required
                          value={formData.quarantine_approved_by}
                          onChange={(e) => setFormData({ ...formData, quarantine_approved_by: e.target.value })}
                          placeholder="Approved Name"
                          className="bg-white border-slate-300 text-xs font-bold text-slate-900"
                        />
                        <input
                          type="file"
                          ref={quarantineAppSigInputRef}
                          onChange={(e) => handleSignatureUpload(e, "quarantine_approved_by_signature")}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-600">Signature:</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => quarantineAppSigInputRef.current?.click()}
                            className="h-6 text-[10px] font-bold text-sky-700 hover:bg-sky-100 px-1.5 cursor-pointer"
                          >
                            <Upload className="h-3 w-3 mr-1" /> Upload Signature
                          </Button>
                        </div>
                        {formData.quarantine_approved_by_signature ? (
                          <div className="rounded border border-slate-300 bg-white p-1 flex items-center gap-2">
                            <img src={formData.quarantine_approved_by_signature} alt="Quarantine Approved Signature" className="h-8 w-auto object-contain max-w-[140px]" />
                            <span className="text-[9px] text-emerald-700 font-bold">✓ Verified</span>
                          </div>
                        ) : (
                          <div className="h-8 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                            Signature Required
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FILE ATTACHMENT */}
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center space-y-1">
                    <input type="file" ref={page2FileInputRef} onChange={handlePage2FileUpload} className="hidden" />
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-4 w-4 text-sky-600" />
                      <span className="font-bold text-slate-800 text-xs">
                        Attach Supporting 8D / RCA Document (Optional)
                      </span>
                    </div>
                    {formData.page2_attachment_name ? (
                      <div className="text-xs font-bold text-emerald-700 bg-emerald-50 py-0.5 px-3 rounded-full inline-block border border-emerald-300">
                        Attached: {formData.page2_attachment_name}
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => page2FileInputRef.current?.click()}
                        className="h-6 text-[11px] font-bold border-slate-300 cursor-pointer"
                      >
                        Choose File to Upload
                      </Button>
                    )}
                  </div>

                  {/* Submit Page 2 Bar */}
                  <div className="border-t border-slate-300 pt-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Save draft to resume later or submit for Admin review.
                    </span>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        className="border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </Button>

                      {/* SAVE AS DRAFT BUTTON */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveDraft}
                        className="border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Save className="h-3.5 w-3.5 text-amber-600" /> Save Draft (Resume Tomorrow)
                      </Button>

                      <Button
                        type="submit"
                        disabled={!isPage2Valid}
                        className={`text-xs font-black text-white shadow-md transition-all ${
                          isPage2Valid
                            ? "bg-sky-600 hover:bg-sky-700 cursor-pointer"
                            : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        Submit Page 2 (Both Reports &rarr; Admin Review)
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL: VIEW & PRINT OFFICIAL DEVIATION REPORT (IMAGE 1 & IMAGE 2 REPLICAS) */}
        {viewReportDev && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-4xl my-8 rounded-2xl border border-slate-300 bg-white p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    OFFICIAL DEVIATION REPORT & CAPA DOCUMENT
                  </h2>
                  <p className="text-xs font-bold text-slate-600 font-mono">
                    DEV CODE: {viewReportDev.dev_code} | AUDIT REF: {viewReportDev.audit_id || "AUD-MSIL-01"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="gap-1.5 text-xs font-bold border-slate-300 cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-300"
                  >
                    <Printer className="h-4 w-4" /> Download / Print Official Document
                  </Button>
                  <button
                    onClick={() => setViewReportDev(null)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 2-PAGE PRINTABLE VIEW (EXACT IMAGE 1 & IMAGE 2 REPLICAS) */}
              <div className="space-y-8 font-sans">
                {/* ── PAGE 1: DEVIATION REPORT (IMAGE 1 FORMAT) ── */}
                <div className="border-2 border-slate-900 bg-white text-xs text-slate-900">
                  {/* Top Header Block */}
                  <div className="grid grid-cols-4 border-b-2 border-slate-900 font-black text-center text-sm uppercase">
                    <div className="p-3 border-r-2 border-slate-900 flex items-center justify-center">
                      SAKTHI AUTO
                    </div>
                    <div className="p-3 col-span-2 border-r-2 border-slate-900 flex items-center justify-center text-base">
                      DEVIATION REPORT
                    </div>
                    <div className="p-3 text-left font-mono text-xs flex flex-col justify-center">
                      <span>DATE: {viewReportDev.report_date || viewReportDev.created_at}</span>
                    </div>
                  </div>

                  {/* Header Sub-row 1: FROM / TO */}
                  <div className="grid grid-cols-2 border-b border-slate-900 font-bold uppercase">
                    <div className="p-2 border-r border-slate-900 flex items-center gap-2">
                      <span className="font-black text-slate-900 w-16">FROM</span>
                      <span>{viewReportDev.from_dept || "QUALITY ASSURANCE"}</span>
                    </div>
                    <div className="p-2 flex items-center gap-2">
                      <span className="font-black text-slate-900 w-16">TO:</span>
                      <span>{viewReportDev.to_dept || "PRODUCTION & MANUFACTURING"}</span>
                    </div>
                  </div>

                  {/* Header Sub-row 2: PART NAME */}
                  <div className="border-b border-slate-900 p-2 flex items-center gap-2 font-bold uppercase">
                    <span className="font-black text-slate-900 w-32">PART NAME</span>
                    <span className="text-sm font-black">{viewReportDev.part_name || viewReportDev.description}</span>
                  </div>

                  {/* Header Sub-row 3: PART NUMBER & STAGE */}
                  <div className="grid grid-cols-3 border-b-2 border-slate-900 font-bold uppercase">
                    <div className="p-2 col-span-2 border-r border-slate-900 flex items-center gap-2">
                      <span className="font-black text-slate-900 w-32">PART NUMBER</span>
                      <span className="text-sm font-black font-mono">{viewReportDev.part_number || "45110-M86R00"}</span>
                    </div>
                    <div className="p-2 flex items-center justify-between text-[10px] font-black">
                      <span className={viewReportDev.stage === "INPROCESS" ? "underline font-extrabold text-brand" : "text-slate-400"}>
                        {viewReportDev.stage === "INPROCESS" ? "☑ INPROCESS" : "☐ INPROCESS"}
                      </span>
                      <span className={viewReportDev.stage === "FINISHED" ? "underline font-extrabold text-brand" : "text-slate-400"}>
                        {viewReportDev.stage === "FINISHED" ? "☑ FINISHED" : "☐ FINISHED"}
                      </span>
                      <span className={viewReportDev.stage === "DEVELOPMENT" ? "underline font-extrabold text-brand" : "text-slate-400"}>
                        {viewReportDev.stage === "DEVELOPMENT" ? "☑ DEVELOPMENT" : "☐ DEVELOPMENT"}
                      </span>
                    </div>
                  </div>

                  {/* OBSERVATION TABLE (IMAGE 1) */}
                  <div className="border-b-2 border-slate-900">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 font-black text-[11px] text-center uppercase bg-slate-100">
                          <th className="p-2 w-12 border-r border-slate-900">SL. NO.</th>
                          <th className="p-2 min-w-[200px] border-r border-slate-900">SPECIFICATION</th>
                          <th colSpan={6} className="p-1 border-r border-slate-900 bg-slate-200">
                            OBSERVATION
                          </th>
                          <th className="p-2 min-w-[140px]">REMARKS</th>
                        </tr>
                        <tr className="border-b border-slate-900 font-black text-[10px] text-center uppercase bg-slate-50">
                          <th className="border-r border-slate-900"></th>
                          <th className="border-r border-slate-900"></th>
                          <th className="p-1 w-10 border-r border-slate-900">1</th>
                          <th className="p-1 w-10 border-r border-slate-900">2</th>
                          <th className="p-1 w-10 border-r border-slate-900">3</th>
                          <th className="p-1 w-10 border-r border-slate-900">4</th>
                          <th className="p-1 w-10 border-r border-slate-900">5</th>
                          <th className="p-1 w-10 border-r border-slate-900">6</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-[11px]">
                        {(viewReportDev.observations && viewReportDev.observations.length > 0
                          ? viewReportDev.observations
                          : DEFAULT_OBSERVATIONS
                        ).map((obs, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold text-center border-r border-slate-900">{obs.sl_no}</td>
                            <td className="p-2 font-medium border-r border-slate-900">{obs.specification}</td>
                            <td className="p-1 text-center font-mono border-r border-slate-900">{obs.obs1}</td>
                            <td className="p-1 text-center font-mono border-r border-slate-900">{obs.obs2}</td>
                            <td className="p-1 text-center font-mono border-r border-slate-900">{obs.obs3}</td>
                            <td className="p-1 text-center font-mono border-r border-slate-900">{obs.obs4}</td>
                            <td className="p-1 text-center font-mono border-r border-slate-900">{obs.obs5}</td>
                            <td className="p-1 text-center font-mono border-r border-slate-900">{obs.obs6}</td>
                            <td className="p-2 font-medium">{obs.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* CC Row */}
                  <div className="p-2 border-b-2 border-slate-900 font-bold flex items-center gap-2">
                    <span className="font-black text-slate-900">CC :</span>
                    <span>{viewReportDev.cc || "PLANT HEAD, QA MANAGER, PRODUCTION INCHARGE"}</span>
                  </div>

                  {/* Bottom Footer (Image 1 Bottom Left & Bottom Right) */}
                  <div className="grid grid-cols-3 font-bold">
                    <div className="p-3 border-r-2 border-slate-900 font-mono text-[10px] flex flex-col justify-end space-y-1">
                      <span>{viewReportDev.doc_code || "QF/08/CQA-55"}</span>
                      <span>{viewReportDev.doc_date || "25.12.2015"}</span>
                    </div>

                    <div className="p-3 border-r-2 border-slate-900 space-y-1">
                      <p className="font-black uppercase text-[10px] text-slate-900">INSPECTED BY</p>
                      <p className="font-bold text-xs">{viewReportDev.inspected_by || viewReportDev.segregated_by}</p>
                      {viewReportDev.inspected_by_signature ? (
                        <img src={viewReportDev.inspected_by_signature} alt="Inspected Signature" className="h-8 max-w-[120px] object-contain border p-1" />
                      ) : (
                        <div className="h-6 border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400 italic">Signature</div>
                      )}
                    </div>

                    <div className="p-3 space-y-1">
                      <p className="font-black uppercase text-[10px] text-slate-900">APPROVED BY</p>
                      <p className="font-bold text-xs">{viewReportDev.approved_by || "KARTHIKEYAN C (690867)"}</p>
                      {viewReportDev.approved_by_signature ? (
                        <img src={viewReportDev.approved_by_signature} alt="Approved Signature" className="h-8 max-w-[120px] object-contain border p-1" />
                      ) : (
                        <div className="h-6 border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400 italic">Signature</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── PAGE 2: ROOT CAUSE, CAPA & QUARANTINE DETAILS (IMAGE 2 FORMAT) ── */}
                <div className="border-2 border-slate-900 bg-white text-xs text-slate-900">
                  <div className="bg-slate-100 p-2 border-b-2 border-slate-900 text-center font-black text-xs uppercase tracking-wider">
                    PAGE 2: ROOT CAUSE, CORRECTIVE ACTION & QUARANTINE DETAILS
                  </div>

                  {/* CAPA TABLE (IMAGE 2 TOP TABLE) */}
                  <div className="border-b-2 border-slate-900 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 font-black text-[11px] text-center uppercase bg-slate-100">
                          <th className="p-2 w-24 border-r border-slate-900">DATE</th>
                          <th className="p-2 w-32 border-r border-slate-900">PART NAME</th>
                          <th className="p-2 w-28 border-r border-slate-900">PART NO.</th>
                          <th className="p-2 min-w-[150px] border-r border-slate-900">NON CONFORMANCE DETAILS</th>
                          <th className="p-2 min-w-[150px] border-r border-slate-900">ROOT CAUSE</th>
                          <th className="p-2 min-w-[180px]">CORRECTIVE ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-[11px]">
                        {(viewReportDev.capa_items && viewReportDev.capa_items.length > 0
                          ? viewReportDev.capa_items
                          : [
                              {
                                date: viewReportDev.created_at || getTodayDateStr(),
                                part_name: viewReportDev.part_name || "STEERING KNUCKLE",
                                part_no: viewReportDev.part_number || "45110-M86R00",
                                non_conformance: viewReportDev.observed_condition || viewReportDev.description,
                                root_cause: viewReportDev.root_cause || "Insert tip wear out during long run machining",
                                corrective_action: viewReportDev.corrective_action || "Replaced tool insert and re-inspected lot.",
                              },
                            ]
                        ).map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-mono font-bold text-center border-r border-slate-900">{item.date}</td>
                            <td className="p-2 font-bold border-r border-slate-900">{item.part_name}</td>
                            <td className="p-2 font-mono font-bold border-r border-slate-900">{item.part_no}</td>
                            <td className="p-2 font-medium border-r border-slate-900">{item.non_conformance}</td>
                            <td className="p-2 font-medium border-r border-slate-900">{item.root_cause}</td>
                            <td className="p-2 font-medium">{item.corrective_action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* QUARANTINE DETAILS SECTION (IMAGE 2 BOTTOM SECTION) */}
                  <div>
                    <div className="p-2 font-black uppercase text-slate-900 border-b border-slate-900 tracking-wider">
                      QUARANTINE DETAILS :
                    </div>

                    {/* Quantities Row */}
                    <div className="grid grid-cols-3 border-b border-slate-900 font-bold uppercase text-center">
                      <div className="p-2 border-r border-slate-900">
                        <span className="font-black text-slate-700 mr-2">SEGREGATED QTY:</span>
                        <span className="font-mono font-black text-sm text-slate-900">
                          {viewReportDev.quarantine_segregated_qty || viewReportDev.segregated_qty || "100"}
                        </span>
                      </div>
                      <div className="p-2 border-r border-slate-900">
                        <span className="font-black text-emerald-800 mr-2">OK QTY:</span>
                        <span className="font-mono font-black text-sm text-emerald-900">
                          {viewReportDev.quarantine_ok_qty || viewReportDev.ok_qty || "95"}
                        </span>
                      </div>
                      <div className="p-2">
                        <span className="font-black text-rose-800 mr-2">NOT OK QTY:</span>
                        <span className="font-mono font-black text-sm text-rose-900">
                          {viewReportDev.quarantine_not_ok_qty || viewReportDev.ng_qty || "5"}
                        </span>
                      </div>
                    </div>

                    {/* Quarantine Signatures Row (Image 2 Bottom) */}
                    <div className="grid grid-cols-2 font-bold uppercase">
                      <div className="p-3 border-r border-slate-900 space-y-1">
                        <p className="font-black text-[10px] text-slate-900">SEGREGATED BY</p>
                        <p className="font-bold text-xs">{viewReportDev.quarantine_segregated_by || viewReportDev.segregated_by}</p>
                        {viewReportDev.quarantine_segregated_by_signature || viewReportDev.employee_signature ? (
                          <img
                            src={viewReportDev.quarantine_segregated_by_signature || viewReportDev.employee_signature}
                            alt="Segregated Signature"
                            className="h-8 max-w-[120px] object-contain border p-1"
                          />
                        ) : (
                          <div className="h-6 border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400 italic">Signature</div>
                        )}
                      </div>

                      <div className="p-3 space-y-1">
                        <p className="font-black text-[10px] text-slate-900">APPROVED BY</p>
                        <p className="font-bold text-xs">{viewReportDev.quarantine_approved_by || viewReportDev.approved_by}</p>
                        {viewReportDev.quarantine_approved_by_signature || viewReportDev.approved_by_signature ? (
                          <img
                            src={viewReportDev.quarantine_approved_by_signature || viewReportDev.approved_by_signature}
                            alt="Approved Signature"
                            className="h-8 max-w-[120px] object-contain border p-1"
                          />
                        ) : (
                          <div className="h-6 border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400 italic">Signature</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-bold text-slate-500">
                  Workflow Status: <span className="uppercase text-purple-800 font-black">{viewReportDev.status.replace("_", " ")}</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewReportDev(null)}
                  className="text-xs font-extrabold border-slate-300 cursor-pointer"
                >
                  Close Document
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
