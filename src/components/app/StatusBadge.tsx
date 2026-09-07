import { STATUS_STYLES } from "@/lib/audit";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const isDeviation = status?.toLowerCase() === "deviation";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {isDeviation && <AlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-pulse shrink-0" />}
      {status}
    </span>
  );
}
