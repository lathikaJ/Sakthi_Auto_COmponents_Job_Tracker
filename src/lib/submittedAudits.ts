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

    const filtered = items.filter((item) => !isAuditDeleted(item.id));

    // Deduplicate items strictly by id / audit_code to avoid 2x-3x duplication bug
    const map = new Map<string, SubmittedAuditItem>();
    filtered.forEach((item) => {
      const key = item.id ? item.id.trim().toUpperCase() : (item.audit_code && item.audit_code.trim()) ? item.audit_code.trim().toUpperCase() : `SUB_${Math.random()}`;

      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const existing = map.get(key)!;
        // Keep item with more recent submission date or active Under Review / Submitted status
        if (
          item.status === "Submitted" ||
          item.status === "Under Review" ||
          item.status === "Deviation" ||
          item.status === "Completed"
        ) {
          map.set(key, { ...existing, ...item });
        }
      }
    });

    const deduplicated = Array.from(map.values());

    // Auto-heal local storage if duplicates were removed
    if (deduplicated.length !== filtered.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
    }

    return deduplicated;
  } catch {
    return INITIAL_SUBMITTED_AUDITS.filter((item) => !isAuditDeleted(item.id));
  }
}

export function recordSubmittedAudit(item: Partial<SubmittedAuditItem> & { audit_code: string }) {
  if (typeof window === "undefined") return;
  try {
    const existing = getSubmittedAudits();
    const recordId = item.id || (item.audit_code.toLowerCase().startsWith("aud-") || item.audit_code.toLowerCase().startsWith("sub-") ? item.audit_code : `sub-${Date.now()}`);
    const newRecord: SubmittedAuditItem = {
      id: recordId,
      audit_code: item.audit_code,
      part_no: item.part_no || item.audit_code,
      part_name: item.part_name || `Audit ${item.audit_code}`,
      employee_name: item.employee_name || "SILAMBARASAN S",
      employee_number: item.employee_number || "688079",
      department: item.department || "Quality Assurance",
      submitted_date: item.submitted_date || new Date().toISOString(),
      formatted_submitted_date: item.formatted_submitted_date || new Date().toLocaleString(),
      status: item.status || "Under Review",
      checkpoints_count: item.checkpoints_count || 5,
      failing_count: item.failing_count || 0,
      ...(item.admin_notes ? { admin_notes: item.admin_notes } : {}),
      ...(item.deviation_id ? { deviation_id: item.deviation_id } : {}),
      ...(item.deviation_code ? { deviation_code: item.deviation_code } : {}),
      ...(item.page1_approved !== undefined ? { page1_approved: item.page1_approved } : {}),
      ...(item.page2_submitted !== undefined ? { page2_submitted: item.page2_submitted } : {}),
    };

    const cleanCode = item.audit_code.trim().toUpperCase();
    const cleanId = recordId.trim().toUpperCase();

    const updated = [
      newRecord,
      ...existing.filter(
        (e) =>
          e.id.trim().toUpperCase() !== cleanId &&
          (!e.audit_code || e.audit_code.trim().toUpperCase() !== cleanCode)
      ),
    ];
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
  extraFields?: Partial<SubmittedAuditItem> & { title?: string }
) {
  if (typeof window === "undefined" || !idOrCode) return;
  try {
    const cleanId = String(idOrCode).trim();
    const cleanUpper = cleanId.toUpperCase();
    const existing = getSubmittedAudits();
    let foundInSubmitted = false;

    // Search sakthi_excel_tasks_v8 for authentic task metadata matching this ID/code
    const storedTasks = localStorage.getItem("sakthi_excel_tasks_v8");
    let matchedTask: any = null;
    let tasks: any[] = [];
    if (storedTasks) {
      try {
        const parsed = JSON.parse(storedTasks);
        if (Array.isArray(parsed)) {
          tasks = parsed;
          matchedTask = tasks.find(
            (t: any) =>
              (t.id && String(t.id).trim().toUpperCase() === cleanUpper) ||
              (t.audit_code && String(t.audit_code).trim().toUpperCase() === cleanUpper)
          );
        }
      } catch {}
    }

    const targetId = matchedTask?.id || cleanId;
    const targetCode = extraFields?.audit_code || matchedTask?.audit_code || cleanId;
    const targetTitle = extraFields?.part_name || extraFields?.title || matchedTask?.title || cleanId;

    const updatedSubmitted = existing.map((item) => {
      const matchId = item.id && String(item.id).trim().toUpperCase() === targetId.toUpperCase();
      const matchCode = item.audit_code && String(item.audit_code).trim().toUpperCase() === targetCode.toUpperCase();
      if (matchId || matchCode) {
        foundInSubmitted = true;
        return {
          ...item,
          id: targetId,
          audit_code: targetCode,
          part_name: targetTitle,
          status,
          ...(adminNotes ? { admin_notes: adminNotes } : {}),
          ...(extraFields || {}),
        };
      }
      return item;
    });

    if (!foundInSubmitted) {
      const extra: any = extraFields || {};
      updatedSubmitted.unshift({
        id: targetId,
        audit_code: targetCode,
        part_no: extra.part_no || targetCode,
        part_name: targetTitle,
        employee_name: extra.employee_name || matchedTask?.auditor_name || "SILAMBARASAN S",
        employee_number: extra.employee_number || extra.assigned_to_employee_number || matchedTask?.assigned_to_employee_number || "688079",
        department: extra.department || matchedTask?.area || "Quality Assurance",
        submitted_date: extra.submitted_date || new Date().toISOString(),
        formatted_submitted_date: extra.formatted_submitted_date || new Date().toLocaleString(),
        status,
        admin_notes: adminNotes,
        ...extra,
      } as any);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSubmitted));

    // Update sakthi_excel_tasks_v8 storage in place
    let taskFound = false;
    tasks = tasks.map((t: any) => {
      const matchId = t.id && String(t.id).trim().toUpperCase() === targetId.toUpperCase();
      const matchCode = t.audit_code && String(t.audit_code).trim().toUpperCase() === targetCode.toUpperCase();
      if (matchId || matchCode) {
        taskFound = true;
        return {
          ...t,
          status,
          ...(extraFields || {}),
          ...(status === "Completed" ? { completion_date: new Date().toISOString().split("T")[0], final_result: "PASS / COMPLIANT" } : {}),
          ...(status === "Deviation" ? { final_result: "DEVIATION IDENTIFIED" } : {}),
        };
      }
      return t;
    });

    if (!taskFound) {
      const extra: any = extraFields || {};
      tasks.unshift({
        id: targetId,
        audit_code: targetCode,
        title: targetTitle,
        status,
        month: extra.month || matchedTask?.month || 1,
        year: extra.year || matchedTask?.year || new Date().getFullYear(),
        ...(status === "Completed" ? { completion_date: new Date().toISOString().split("T")[0], final_result: "PASS / COMPLIANT" } : {}),
        ...(status === "Deviation" ? { final_result: "DEVIATION IDENTIFIED" } : {}),
      });
    }

    localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(tasks));

    window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
    window.dispatchEvent(new Event("excel_tasks_updated"));
  } catch (err) {
    console.error("Failed to update submitted audit status", err);
  }
}

export function deleteSubmittedAudit(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const cleanId = String(id).trim();
    const cleanUpper = cleanId.toUpperCase();

    // 1. Mark unique ID as permanently deleted identifier
    addDeletedAuditIdentifier(cleanId);

    // 2. Remove from submitted audits storage strictly by ID
    let rawList: SubmittedAuditItem[] = [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) rawList = parsed;
      } catch {}
    }

    const updated = rawList.filter(
      (item) => !item.id || item.id.trim().toUpperCase() !== cleanUpper
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // 3. Remove from main tasks storage (sakthi_excel_tasks_v8) strictly by ID
    const storedTasks = localStorage.getItem("sakthi_excel_tasks_v8");
    if (storedTasks) {
      try {
        const tasks = JSON.parse(storedTasks);
        if (Array.isArray(tasks)) {
          const cleanedTasks = tasks.filter(
            (t: any) => !t.id || String(t.id).trim().toUpperCase() !== cleanUpper
          );
          localStorage.setItem("sakthi_excel_tasks_v8", JSON.stringify(cleanedTasks));
        }
      } catch {}
    }

    // 4. Delete from Supabase database strictly by ID
    void supabase.from("audit_assignments").delete().eq("id", cleanId);

    window.dispatchEvent(new Event("sakthi_submitted_audits_updated"));
    window.dispatchEvent(new Event("excel_tasks_updated"));
    window.dispatchEvent(new Event("sakthi_deleted_audits_updated"));
  } catch (err) {
    console.error("Failed to delete submitted audit", err);
  }
}
