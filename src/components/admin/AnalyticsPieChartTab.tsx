import { useState } from "react";
import {
  PieChart as PieChartIcon,
  Sparkles,
  AlertTriangle,
  FileCheck2,
  Package,
  RefreshCcw,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DataPoint = {
  name: string;
  value: number;
  color: string;
  description: string;
};

export function AnalyticsPieChartTab() {
  const [activeTab, setActiveTab] = useState<"category" | "health">("category");

  // 1. Audit Distribution Dataset
  const categoryData: DataPoint[] = [
    {
      name: "Product Audits",
      value: 3,
      color: "#0D9488", // Professional Teal
      description: "MSIL Knuckle Steering & Receiving Inspections",
    },
    {
      name: "Revalidation Audits",
      value: 6,
      color: "#0284C7", // Sky Blue
      description: "Mahindra & Mahindra Bi-Annual Revalidation Schedule",
    },
    {
      name: "Process & Dock Audits",
      value: 2,
      color: "#6366F1", // Deep Indigo
      description: "Stellantis Dock & Volvo Layout Inspections",
    },
    {
      name: "Quality Deviations",
      value: 1,
      color: "#EF4444", // CRITICAL REQUIREMENT: EXPLICIT STRONG RED (#EF4444)
      description: "Non-conformance & Out of Spec Flagged Issues",
    },
  ];

  // 2. Plant Quality Health & Compliance Breakdown Dataset
  const healthData: DataPoint[] = [
    {
      name: "Completed / Verified",
      value: 4,
      color: "#64748B", // Cool Slate Grey
      description: "Successfully signed and archived audits",
    },
    {
      name: "Active In-Progress",
      value: 3,
      color: "#0D9488", // Teal
      description: "Under execution by assigned inspectors",
    },
    {
      name: "Scheduled Assigned",
      value: 2,
      color: "#0284C7", // Sky Blue
      description: "Assigned for upcoming monthly plan",
    },
    {
      name: "Quality Deviations",
      value: 1,
      color: "#EF4444", // CRITICAL REQUIREMENT: EXPLICIT STRONG RED (#EF4444)
      description: "Flagged deviations requiring CAPA review",
    },
  ];

  const currentData = activeTab === "category" ? categoryData : healthData;
  const totalValue = currentData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <PieChartIcon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Quality Analytics & Audit Distribution Pie Chart
            </h2>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 flex items-center gap-1 border border-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Real-Time Recharts Analytics
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Visual metrics breakdown across audit categories, completion rates, and highlighted quality deviations.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-lg border border-slate-300 bg-slate-100 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("category")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "category"
                ? "bg-white text-indigo-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Audit Categories
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("health")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "health"
                ? "bg-white text-indigo-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Plant Quality Health
          </button>
        </div>
      </div>

      {/* Main Analytics Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
        {/* Recharts Pie Chart Display (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 p-6 min-h-[360px]">
          <h3 className="text-sm font-bold text-slate-900 mb-2">
            {activeTab === "category"
              ? "Audit Category Distribution"
              : "Quality Health & Status Breakdown"}
          </h3>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {currentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length && payload[0]?.payload) {
                      const data = payload[0].payload as DataPoint;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md space-y-1">
                          <p className="text-xs font-bold" style={{ color: data.color }}>
                            {data.name}
                          </p>
                          <p className="text-sm font-black text-slate-900">
                            {data.value} Audits ({((data.value / totalValue) * 100).toFixed(1)}%)
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">{data.description}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-xs font-bold text-slate-700">
                      {value} ({entry.payload.value})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend & Segment KPI Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Segment Breakdown & Metrics
          </h3>

          {currentData.map((item) => {
            const isDeviation = item.name.includes("Deviation");
            const percentage = ((item.value / totalValue) * 100).toFixed(1);

            return (
              <div
                key={item.name}
                className={`rounded-xl border p-3.5 transition-all ${
                  isDeviation
                    ? "border-rose-300 bg-rose-50/80 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={`text-xs font-extrabold ${isDeviation ? "text-rose-900" : "text-slate-900"}`}>
                      {item.name}
                    </span>
                    {isDeviation && (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Critical Red Flag
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono text-sm font-black ${
                      isDeviation ? "text-rose-700" : "text-slate-800"
                    }`}
                  >
                    {item.value} ({percentage}%)
                  </span>
                </div>
                <p className={`mt-1 text-[11px] font-medium pl-6 ${isDeviation ? "text-rose-800" : "text-slate-500"}`}>
                  {item.description}
                </p>
              </div>
            );
          })}

          {/* Deviation Alert Highlight Note */}
          <div className="rounded-xl border border-rose-300 bg-rose-100/70 p-3.5 flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-950">
                Mandatory Deviation Highlight Rule
              </p>
              <p className="text-[11px] font-medium text-rose-800 mt-0.5 leading-relaxed">
                As per quality compliance standards, all <strong>Deviation</strong> segments are strictly rendered in bold Crimson Red (<strong>#EF4444</strong>) for immediate high-priority visibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
