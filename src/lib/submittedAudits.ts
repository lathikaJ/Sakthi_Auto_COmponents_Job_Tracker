export type SubmittedAuditItem = {
  id: string;
  audit_code: string;
  part_no: string;
  part_name: string;
  employee_name: string;
  employee_number: string;
  department: string;
  submitted_date: string; // ISO format
  formatted_submitted_date: string;
  status: "Submitted" | "Approved" | "Rejected" | "Completed" | "Under Review" | "Not Completed" | "Deviation" | "Page 1 Approved" | "Page 2 Submitted";
  checkpoints_count?: number;
  failing_count?: number;
  admin_notes?: string;
  deviation_id?: string;
  deviation_code?: string;
  page1_approved?: boolean;
  page2_submitted?: boolean;
};

import { addDeletedAuditIdentifier, isAuditDeleted } from "./audit";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "sakthi_submitted_audits_v2";

export const INITIAL_SUBMITTED_AUDITS: SubmittedAuditItem[] = [
  {
    id: "sub-rev-001",
    audit_code: "REV-001",
    part_no: "0401DAA02010N / 2000N",
    part_name: "Steering Knuckle Housing LH/RH – MPV",
    employee_name: "KARTHIKEYAN C",
    employee_number: "690867",
    department: "Quality Assurance",
    submitted_date: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    formatted_submitted_date: "23 Aug 2026, 11:15 AM",
    status: "Completed",
    checkpoints_count: 5,
    failing_count: 0,
  },
  {
    id: "sub-rev-002",
    audit_code: "REV-002",
    part_no: "027505 / 027506",
    part_name: "Steering Knuckle - Bolero",
    employee_name: "SILAMBARASAN S",
    employee_number: "688079",
    department: "Machining Line 1",
    submitted_date: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    formatted_submitted_date: "23 Aug 2026, 09:30 AM",
    status: "Under Review",
    checkpoints_count: 5,
    failing_count: 0,
  },
  {
    id: "sub-lay-vol-01",
    audit_code: "LAY-VOL-01",
    part_no: "23407840 / P03",
    part_name: "Fan Bracket Low Fan Hub (Volvo)",
    employee_name: "VENKADESH D",
    employee_number: "663875",
    department: "Machine Shop 2",
    submitted_date: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
    formatted_submitted_date: "22 Aug 2026, 04:45 PM",
    status: "Under Review",
    checkpoints_count: 7,
    failing_count: 0,
  },
  {
    id: "sub-aud-msil-01",
    audit_code: "AUD-MSIL-01",
    part_no: "45111 M 55TA0 / 45151 M 55TA0",
    part_name: "Knuckle Steering R/L - YTA/YTB (MSIL)",
    employee_name: "MOUNIKASRI A",
    employee_number: "710250",
    department: "Quality Lab",
    submitted_date: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    formatted_submitted_date: "22 Aug 2026, 11:10 AM",
    status: "Approved",
    checkpoints_count: 7,
    failing_count: 0,
  },
  {
    id: "sub-rev-004",
    audit_code: "REV-004",
    part_no: "0082597",
    part_name: "Disc Brake - Bolero",
    employee_name: "KAVIN KUMAR K",
    employee_number: "666468",
    department: "Assembly & Dock",
    submitted_date: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
    formatted_submitted_date: "21 Aug 2026, 02:20 PM",
    status: "Completed",
    checkpoints_count: 5,
    failing_count: 0,
  },
];

export function getSubmittedAudits(): SubmittedAuditItem[] {
  if (typeof window === "undefined") return INITIAL_SUBMITTED_AUDITS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let items: SubmittedAuditItem[] = [];
    if (!raw) {
      items = INITIAL_SUBMITTED_AUDITS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SUBMITTED_AUDITS));
    } else {
      const parsed = JSON.parse(raw);
      items = Array.isArray(parsed) ? parsed : INITIAL_SUBMITTED_AUDITS;
    }
    return items.filter((item) => !isAuditDeleted(item.id, item.audit_code));
  } catch {
    return INITIAL_SUBMITTED_AUDITS.filter((item) => !isAuditDeleted(item.id, item.audit_code));
  }
}

export function recordSubmittedAudit(item: Omit<SubmittedAuditItem, "id">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getSubmittedAudits();
    const newRecord: SubmittedAuditItem = {
      ...item,
      id: `sub-${Date.now()}`,
    };
    const updated = [newRecord, ...existing.filter((e) => e.audit_code !== item.audit_code)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
  } catch (err) {
    console.error("Failed to record submitted audit", err);
  }
}

export function updateSubmittedAuditStatus(
  idOrCode: string,
  status: SubmittedAuditItem["status"],
  adminNotes?: string,
  extraFields?: Partial<SubmittedAuditItem>
) {
  if (typeof window === "undefined") return;
  try {
    const existing = getSubmittedAudits();
    const updated = existing.map((item) => {
      if (item.id === idOrCode || item.audit_code === idOrCode || item.audit_code.toLowerCase() === idOrCode.toLowerCase()) {
        return {
          ...item,
          status,
          ...(adminNotes ? { admin_notes: adminNotes } : {}),
          ...(extraFields || {}),
        };
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
  } catch (err) {
    console.error("Failed to update submitted audit status", err);
  }
}

export function deleteSubmittedAudit(idOrCode: string) {
  if (typeof window === "undefined") return;
  try {
    let rawList: SubmittedAuditItem[] = [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) rawList = parsed;
      } catch {}
    }
    if (rawList.length === 0) rawList = INITIAL_SUBMITTED_AUDITS;

    const updated = rawList.filter(
      (item) =>
        item.id !== idOrCode &&
        item.audit_code !== idOrCode &&
        item.audit_code?.toLowerCase() !== idOrCode.toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
  } catch (err) {
    console.error("Failed to delete submitted audit", err);
  }
}
