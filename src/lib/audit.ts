export const AUDIT_TYPES = ["Product", "Process", "Revalidation"] as const;
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
      { id: "P1", description: "Part identification & traceability tag", specification: "Tag present, legible, matches route card" },
      { id: "P2", description: "Critical dimension check", specification: "Within drawing tolerance" },
      { id: "P3", description: "Surface finish / visual defects", specification: "No burr, dent, crack or rust" },
      { id: "P4", description: "Gauge / instrument calibration validity", specification: "Calibration due date not exceeded" },
      { id: "P5", description: "Packing & labelling standard", specification: "As per packing standard sheet" },
    ],
    Process: [
      { id: "R1", description: "Operator adherence to SOP", specification: "SOP displayed and followed" },
      { id: "R2", description: "Machine parameter setting", specification: "Matches approved process sheet" },
      { id: "R3", description: "Poka-yoke / safety interlock function", specification: "Functional, verified at shift start" },
      { id: "R4", description: "5S and workplace condition", specification: "Area clean, tools in place" },
      { id: "R5", description: "In-process inspection frequency", specification: "As per control plan" },
    ],
    Revalidation: [
      { id: "V1", description: "Equipment calibration certificate", specification: "Valid and available" },
      { id: "V2", description: "Process capability re-check", specification: "Cpk >= 1.33" },
      { id: "V3", description: "Furnace / cycle parameter verification", specification: "Within validated window" },
      { id: "V4", description: "Layout inspection of sample part", specification: "All characteristics conform" },
      { id: "V5", description: "Records & documentation update", specification: "Revalidation report filed" },
    ],
  };

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
