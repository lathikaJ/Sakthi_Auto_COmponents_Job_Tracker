export const AUDIT_TYPES = ["Product", "Process", "Revalidation", "Dock Audit"] as const;
export type AuditType = (typeof AUDIT_TYPES)[number];

export const AUDIT_STATUSES = [
  "Planned",
  "Assigned",
  "In Progress",
  "Submitted",
  "Completed",
  "Deviation",
  "Overdue",
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type Checkpoint = {
  id: string;
  description: string;
  specification: string;
  result: "OK" | "NOT OK" | "NA" | "";
  observed: string;
  remarks: string;
};

const TEMPLATES: Record<AuditType, Array<Pick<Checkpoint, "id" | "description" | "specification">>> =
  {
    Product: [
      { id: "P1", description: "HARDNESS (MSIL QF/08/CQA-09)", specification: "164 ~ 188 BHN / 85 ~ 91HRB" },
      { id: "P2", description: "MICROSTRUCTURE SPHEROIDIZATION & PEARLITE", specification: "Spheroidization >=80%, Pearlite 10-40%, Nodule Count >=70 PCS/mm²" },
      { id: "P3", description: "TENSILE STRENGTH", specification: "500 MPa MIN" },
      { id: "P4", description: "YIELD STRENGTH @ 0.2% & 0.5%", specification: "@ 0.2%: 320 MPa MIN, @ 0.5%: 340 MPa MIN" },
      { id: "P5", description: "ELONGATION & IMPACT STRENGTH", specification: "Elongation >=10%, Impact Strength >=8J/cm² MIN" },
      { id: "P6", description: "OP-010 RECEIVING INSPECTION ROUGH CASTING (APPEARANCE)", specification: "Free of crack/flaw/rust; Legible casting letters; Surface as per CFT-16; Hardness & X-ray marks at OP20" },
      { id: "P7", description: "OP-010 RECEIVING INSPECTION ROUGH CASTING (PAINTING)", specification: "Ensure Black dip painting; No paint peel off / overflow / damages (Part 45111/45151-55T00)" },
    ],
    Process: [
      { id: "D1", description: "MASTER SAMPLE COMPARISON (QF/08/CQA-37)", specification: "Should be compared with master sample (All radius, chamfer, casting profile, milling range, etc.) [VISUAL]" },
      { id: "D2", description: "APPEARANCE 10-POINT CHECK", specification: "No blow hole/cold joint, no pin hole/slag, no wall thickness variation, no sharp edge, no dent/damage, no fettling undercut, no flaws, no rust/thread damage, no paint peel off, completion of all ops [VISUAL]" },
      { id: "D3", description: "RP OIL CONDITION VERIFICATION", specification: "Ensure RP oil condition verification (No excess oil, no dust/burr/scrap and no foreign particles) [VISUAL]" },
      { id: "D4", description: "PACKING BOX & VCI COVER CONDITION", specification: "Ensure packing box condition (Proper center pad/foam, no damage) VCI cover condition (No damage, no water) [VISUAL]" },
      { id: "D5", description: "PACKING OF PARTS VERIFICATION", specification: "Ensure packing of parts (Qty per layer = 24, Qty per box = 144, labeling info) refer reference [VISUAL]" },
      { id: "D6", description: "PART MIXUP PREVENTION", specification: "Ensure no part mixup [VISUAL]" },
      { id: "D7", description: "AVAILABILITY OF COMMITMENT MARK", specification: "Ensure availability of commitment mark if any [VISUAL]" },
      { id: "D8", description: "FOREIGN PARTICLES IN BOX", specification: "Ensure no foreign particles in the box [VISUAL]" },
      { id: "D9", description: "PACKING LABEL & STATUS", specification: "Ensure packing label pasted on box with correct part name/number (STELLANTIS 9845800980 & 9845801180) [VISUAL]" },
    ],
    Revalidation: [
      { id: "V1", description: "Steering Knuckle Housing LH/RH – MPV (0401DAA02010N / 2000N)", specification: "Revalidation Plan Jan-26 / Jul-26" },
      { id: "V2", description: "Steering Knuckle - Bolero (027505 / 027506)", specification: "Revalidation Plan May-26 / Nov-26" },
      { id: "V3", description: "Steering Knuckle IFS LH/RH - (W501/3G ECO) (0401DBB00830N)", specification: "Revalidation Plan May-26 / Nov-26" },
      { id: "V4", description: "Disc Brake - Bolero (0082597)", specification: "Revalidation Plan Feb-26 / Aug-26" },
      { id: "V5", description: "Steering Knuckle LH/RH – Bolero Passenger (NABS) (0401DEB00010N)", specification: "Revalidation Plan Apr-26 / Oct-26" },
      { id: "V6", description: "Steering Knuckle LH/RH – Bolero Passenger – ABS (0401DAA03600N)", specification: "Revalidation Plan Feb-26 / Aug-26" },
    ],
    "Dock Audit": [
      { id: "D1", description: "MASTER SAMPLE COMPARISON (QF/08/CQA-37)", specification: "Should be compared with master sample (All radius, chamfer, casting profile, milling range, etc.) [VISUAL]" },
      { id: "D2", description: "APPEARANCE 10-POINT CHECK", specification: "No blow hole/cold joint, no pin hole/slag, no wall thickness variation, no sharp edge, no dent/damage, no fettling undercut, no flaws, no rust/thread damage, no paint peel off, completion of all ops [VISUAL]" },
      { id: "D3", description: "RP OIL CONDITION VERIFICATION", specification: "Ensure RP oil condition verification (No excess oil, no dust/burr/scrap and no foreign particles) [VISUAL]" },
      { id: "D4", description: "PACKING BOX & VCI COVER CONDITION", specification: "Ensure packing box condition (Proper center pad/foam, no damage) VCI cover condition (No damage, no water) [VISUAL]" },
      { id: "D5", description: "PACKING OF PARTS VERIFICATION", specification: "Ensure packing of parts (Qty per layer = 24, Qty per box = 144, labeling info) refer reference [VISUAL]" },
      { id: "D6", description: "PART MIXUP PREVENTION", specification: "Ensure no part mixup [VISUAL]" },
      { id: "D7", description: "AVAILABILITY OF COMMITMENT MARK", specification: "Ensure availability of commitment mark if any [VISUAL]" },
      { id: "D8", description: "FOREIGN PARTICLES IN BOX", specification: "Ensure no foreign particles in the box [VISUAL]" },
      { id: "D9", description: "PACKING LABEL & STATUS", specification: "Ensure packing label pasted on box with correct part name/number (STELLANTIS 9845800980 & 9845801180) [VISUAL]" },
    ],
  };

export const SIX_AUDIT_CATEGORIES = [
  "Product Audit",
  "Revalidation Audit",
  "Dock Audit",
  "Process Audit",
  "Layout Audit",
  "Supplier Audit",
] as const;
export type AuditCategory = (typeof SIX_AUDIT_CATEGORIES)[number];

export interface NoProductionRecord {
  id: string;
  part_number: string;
  product_name: string;
  audit_type: "Product" | "Revalidation" | "Dock Audit" | "Process" | "Layout" | "Supplier";
  planned_production: number;
  actual_production: number;
  production_percentage: number;
  threshold_percentage: number;
  status: "Critical" | "Warning" | "Normal" | "No Production";
}

export type LowProductionRecord = NoProductionRecord;

export interface AuditDocument {
  id: string;
  audit_id: string;
  document_name: string;
  document_type: string;
  uploaded_by: string;
  uploaded_at: string;
  url: string;
}

export const DEFAULT_NO_PRODUCTION_DATA: NoProductionRecord[] = [
  {
    id: "lp-01",
    part_number: "0401DAA02010N",
    product_name: "Steering Knuckle Housing LH/RH – MPV",
    audit_type: "Product",
    planned_production: 12000,
    actual_production: 0,
    production_percentage: 0.0,
    threshold_percentage: 85.0,
    status: "No Production",
  },
  {
    id: "lp-02",
    part_number: "9845800980",
    product_name: "PIVOT SUSPENSION GOA CC21 (D78) LH",
    audit_type: "Dock Audit",
    planned_production: 15000,
    actual_production: 0,
    production_percentage: 0.0,
    threshold_percentage: 80.0,
    status: "No Production",
  },
  {
    id: "lp-03",
    part_number: "027505 / 027506",
    product_name: "Steering Knuckle - Bolero",
    audit_type: "Revalidation",
    planned_production: 9500,
    actual_production: 0,
    production_percentage: 0.0,
    threshold_percentage: 85.0,
    status: "No Production",
  },
  {
    id: "lp-04",
    part_number: "0082597",
    product_name: "Disc Brake - Bolero",
    audit_type: "Product",
    planned_production: 18000,
    actual_production: 0,
    production_percentage: 0.0,
    threshold_percentage: 80.0,
    status: "No Production",
  },
];

export const DEFAULT_LOW_PRODUCTION_DATA = DEFAULT_NO_PRODUCTION_DATA;

export function buildCheckpoints(type: AuditType): Checkpoint[] {
  return TEMPLATES[type].map((c) => ({ ...c, result: "", observed: "", remarks: "" }));
}

export const STATUS_STYLES: Record<string, string> = {
  Planned: "bg-muted text-muted-foreground border-border",
  Assigned: "bg-accent text-accent-foreground border-accent",
  "In Progress": "bg-info/10 text-info border-info/30",
  Submitted: "bg-brand/12 text-brand-hover border-brand/40",
  Completed: "bg-success/12 text-success border-success/30",
  Deviation: "bg-destructive/10 text-destructive border-destructive/30",
  Overdue: "bg-warning/15 text-warning border-warning/40",
  Open: "bg-destructive/10 text-destructive border-destructive/30",
  "Under Review": "bg-info/10 text-info border-info/30",
  "Action Assigned": "bg-warning/15 text-warning border-warning/40",
  Closed: "bg-success/12 text-success border-success/30",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPG, PNG or WEBP images are allowed.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export const DEFAULT_OFFICIAL_AUDITS = [
  {
    id: "aud-doc-stell-01",
    audit_code: "DOC-STELL-01",
    title: "Dock Audit Inspection Report — PIVOT SUSPENSION GOA CC21 (D78) LH/RH (STELLANTIS)",
    audit_type: "Process",
    area: "Assembly & Dock",
    assigned_to_employee_number: "688079",
    month: 8,
    year: 2026,
    due_date: "2026-08-31",
    status: "In Progress",
  },
  {
    id: "aud-rev-002",
    audit_code: "REV-002",
    title: "Steering Knuckle - Bolero (Revalidation Audit)",
    audit_type: "Revalidation",
    area: "Machine Shop 2",
    assigned_to_employee_number: "688079",
    month: 5,
    year: 2026,
    due_date: "2026-05-31",
    status: "In Progress",
  },
  {
    id: "aud-msil-01",
    audit_code: "AUD-MSIL-01",
    title: "Knuckle Steering R/L - YTA / YTB Inspection (MSIL)",
    audit_type: "Product",
    area: "Rough Casting & Machining",
    assigned_to_employee_number: "708818",
    month: 6,
    year: 2026,
    due_date: "2026-06-30",
    status: "In Progress",
  },
  {
    id: "aud-rev-001",
    audit_code: "REV-001",
    title: "Steering Knuckle Housing LH/RH – MPV (Revalidation)",
    audit_type: "Revalidation",
    area: "Machining Line 1",
    assigned_to_employee_number: "690867",
    month: 1,
    year: 2026,
    due_date: "2026-01-31",
    status: "Completed",
  },
  {
    id: "aud-rev-003",
    audit_code: "REV-003",
    title: "Steering Knuckle IFS LH/RH - (W501/3G ECO)",
    audit_type: "Revalidation",
    area: "Machining Line 3",
    assigned_to_employee_number: "663875",
    month: 5,
    year: 2026,
    due_date: "2026-05-31",
    status: "Assigned",
  },
  {
    id: "aud-rev-004",
    audit_code: "REV-004",
    title: "Disc Brake - Bolero (Revalidation Audit)",
    audit_type: "Revalidation",
    area: "Machine Shop 2",
    assigned_to_employee_number: "710250",
    month: 2,
    year: 2026,
    due_date: "2026-02-28",
    status: "Completed",
  },
  {
    id: "aud-rev-005",
    audit_code: "REV-005",
    title: "Steering Knuckle LH/RH – Bolero Passenger (NABS)",
    audit_type: "Revalidation",
    area: "Assembly & Dock",
    assigned_to_employee_number: "666468",
    month: 4,
    year: 2026,
    due_date: "2026-04-30",
    status: "Assigned",
  },
  {
    id: "aud-rev-006",
    audit_code: "REV-006",
    title: "Steering Knuckle LH/RH – Bolero Passenger – ABS",
    audit_type: "Revalidation",
    area: "Value Added Engg",
    assigned_to_employee_number: "665773",
    month: 2,
    year: 2026,
    due_date: "2026-02-28",
    status: "Submitted",
  },
  {
    id: "aud-lay-vol-01",
    audit_code: "LAY-VOL-01",
    title: "Layout Inspection - Fan Bracket Low Fan Hub (Volvo)",
    audit_type: "Process",
    area: "Volvo Machining Line",
    assigned_to_employee_number: "665965",
    month: 1,
    year: 2026,
    due_date: "2026-01-31",
    status: "In Progress",
  },
];

/**
 * Utility to merge and deduplicate task arrays by audit_code / id / title.
 * Prevents identical audit records from being duplicated 25+ times upon file import or reload.
 */
export function mergeAndDeduplicateTasks<T extends { audit_code?: string; id?: string; title?: string }>(
  existingTasks: T[],
  newTasks: T[] = []
): T[] {
  const map = new Map<string, T>();

  const getKey = (task: T): string => {
    if (task.audit_code && typeof task.audit_code === "string" && task.audit_code.trim()) {
      return task.audit_code.trim().toUpperCase();
    }
    if (task.id && typeof task.id === "string" && task.id.trim() && !task.id.startsWith("temp-") && !task.id.startsWith("imp-")) {
      return task.id.trim().toUpperCase();
    }
    if (task.title && typeof task.title === "string" && task.title.trim()) {
      return task.title.trim().toUpperCase();
    }
    return `TASK-${Math.random()}`;
  };

  (existingTasks || []).forEach((task) => {
    if (!task) return;
    const key = getKey(task);
    if (!map.has(key)) {
      map.set(key, task);
    }
  });

  (newTasks || []).forEach((task) => {
    if (!task) return;
    const key = getKey(task);
    if (map.has(key)) {
      const existing = map.get(key)!;
      map.set(key, {
        ...existing,
        ...task,
        id: existing.id || task.id,
      });
    } else {
      map.set(key, task);
    }
  });

  return Array.from(map.values());
}
