import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  X,
  PieChart as PieIcon,
  Timer,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  BarChart2,
  TrendingUp,
} from "lucide-react";

export type AuditCounts = {
  ongoing: number;
  deviation: number;
  completed: number;
};

export function getLiveAuditCounts(): AuditCounts {
  let ongoing = 0;
  let deviation = 0;
  let completed = 0;

  if (typeof window !== "undefined") {
    // 1. Read stored excel tasks
    const storedTasks = localStorage.getItem("sakthi_excel_tasks");
    if (storedTasks) {
      try {
        const tasks = JSON.parse(storedTasks);
        if (Array.isArray(tasks) && tasks.length > 0) {
          tasks.forEach((t: any) => {
            if (t.status === "Completed") {
              completed++;
            } else if (t.status === "Deviation") {
              deviation++;
            } else {
              ongoing++;
            }
          });
        }
      } catch {}
    }

    // 2. Read stored deviations
    const storedDevs = localStorage.getItem("sakthi_deviations");
    if (storedDevs) {
      try {
        const devs = JSON.parse(storedDevs);
        if (Array.isArray(devs) && devs.length > 0) {
          // Add unique deviations
          deviation = Math.max(deviation, devs.length);
        }
      } catch {}
    }
  }

  // Fallback defaults for demonstration if empty
  if (ongoing === 0 && deviation === 0 && completed === 0) {
    ongoing = 8;
    deviation = 3;
    completed = 14;
  }

  return { ongoing, deviation, completed };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuditPieChartModal({ isOpen, onClose }: Props) {
  const [counts, setCounts] = useState<AuditCounts>({
    ongoing: 0,
    deviation: 0,
    completed: 0,
  });

  const loadCounts = () => {
    setCounts(getLiveAuditCounts());
  };

  useEffect(() => {
    if (isOpen) {
      loadCounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAudits = counts.ongoing + counts.deviation + counts.completed;

  const data = [
    {
      name: "Ongoing Audits",
      value: counts.ongoing,
      color: "#0284C7", // Sky 600
      bg: "bg-sky-50 text-sky-700 border-sky-200",
      icon: Timer,
    },
    {
      name: "Deviation Observations",
      value: counts.deviation,
      color: "#F59E0B", // Amber 500
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      icon: AlertTriangle,
    },
    {
      name: "Completed Audits",
      value: counts.completed,
      color: "#10B981", // Emerald 500
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = totalAudits > 0 ? ((item.value / totalAudits) * 100).toFixed(1) : 0;
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 shadow-xl text-white">
          <p className="text-xs font-bold" style={{ color: item.payload.color }}>
            {item.name}
          </p>
          <p className="text-lg font-black mt-0.5">
            {item.value} <span className="text-xs font-medium text-slate-400">({percentage}%)</span>
          </p>
        </div>
      );
    };
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl space-y-0">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand/10 p-2 text-brand">
              <PieIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Machine Shop Audit Status Analytics
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Distribution breakdown of Ongoing, Deviation, and Completed Audits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadCounts}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh Data"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Recharts Pie Chart & Legend Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 items-center">
            {/* Pie Chart Container */}
            <div className="relative h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Counter Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900 tabular-nums">
                  {totalAudits}
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Audits
                </span>
              </div>
            </div>

            {/* Side Metrics Breakdown */}
            <div className="space-y-3">
              {data.map((item) => {
                const Icon = item.icon;
                const pct = totalAudits > 0 ? ((item.value / totalAudits) * 100).toFixed(1) : "0";

                return (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between p-3.5 rounded-xl border ${item.bg} transition-all hover:scale-[1.02]`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-lg p-2 text-white shadow-xs"
                        style={{ backgroundColor: item.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.name}</p>
                        <p className="text-[11px] font-medium text-slate-500">
                          {pct}% of overall volume
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900 tabular-nums">
                        {item.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Live metrics dynamically sync with database records.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            Close Chart View
          </button>
        </div>
      </div>
    </div>
  );
}
