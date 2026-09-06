export type ActivityLogItem = {
  id: string;
  employee_number: string;
  full_name: string;
  department: string;
  designation: string;
  role: "admin" | "employee";
  event_type: "LOGIN" | "LOGOUT";
  timestamp: string; // ISO format string
};

const STORAGE_KEY = "sakthi_user_activity_logs";

export const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [
  {
    id: "log-690867-in",
    employee_number: "690867",
    full_name: "KARTHIKEYAN C",
    department: "Quality Assurance",
    designation: "Quality Operations Lead",
    role: "admin",
    event_type: "LOGIN",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "log-688079-out",
    employee_number: "688079",
    full_name: "SILAMBARASAN S",
    department: "Machining Line 1",
    designation: "Senior Quality Engineer",
    role: "employee",
    event_type: "LOGOUT",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "log-688079-in",
    employee_number: "688079",
    full_name: "SILAMBARASAN S",
    department: "Machining Line 1",
    designation: "Senior Quality Engineer",
    role: "employee",
    event_type: "LOGIN",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "log-1003-out",
    employee_number: "1003",
    full_name: "K. Arun Kumar",
    department: "Production",
    designation: "Line Supervisor",
    role: "employee",
    event_type: "LOGOUT",
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    id: "log-1003-in",
    employee_number: "1003",
    full_name: "K. Arun Kumar",
    department: "Production",
    designation: "Line Supervisor",
    role: "employee",
    event_type: "LOGIN",
    timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
  },
  {
    id: "log-1004-in",
    employee_number: "1004",
    full_name: "M. Deepa",
    department: "Production",
    designation: "Process Inspector",
    role: "employee",
    event_type: "LOGIN",
    timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
  },
  {
    id: "log-1005-in",
    employee_number: "1005",
    full_name: "V. Saravanan",
    department: "Production",
    designation: "Shift Engineer",
    role: "employee",
    event_type: "LOGIN",
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
  },
];

export function getActivityLogs(): ActivityLogItem[] {
  if (typeof window === "undefined") return INITIAL_ACTIVITY_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ACTIVITY_LOGS));
      return INITIAL_ACTIVITY_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ACTIVITY_LOGS;
  } catch {
    return INITIAL_ACTIVITY_LOGS;
  }
}

export function recordActivityLog(entry: Omit<ActivityLogItem, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getActivityLogs();
    const newLog: ActivityLogItem = {
      ...entry,
      id: `log-${Date.now()}-${entry.employee_number}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("sakthi_activity_logs_updated"));
  } catch (err) {
    console.error("Failed to record activity log", err);
  }
}

export function clearActivityLogs() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new Event("sakthi_activity_logs_updated"));
}
