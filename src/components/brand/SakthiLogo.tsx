import { cn } from "@/lib/utils";

function Trident({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 96" className={className} aria-hidden="true" fill="currentColor">
      {/* outer prongs */}
      <path d="M6 6c6 10 8 20 7 31a12 12 0 0 0 9 11v-9a20 20 0 0 1-3-11c0-8-5-16-13-22Z" />
      <path d="M58 6c-6 10-8 20-7 31a12 12 0 0 1-9 11v-9a20 20 0 0 0 3-11c0-8 5-16 13-22Z" />
      {/* centre prong */}
      <path d="M32 2c-4 8-5 16-5 24v22h10V26c0-8-1-16-5-24Z" />
      {/* bowl */}
      <path d="M13 40a19 19 0 0 0 38 0h-9a10 10 0 0 1-20 0h-9Z" />
      {/* shaft */}
      <rect x="27" y="52" width="10" height="42" rx="3" />
    </svg>
  );
}

export function SakthiLogo({
  className,
  variant = "dark",
  showTagline = false,
}: {
  className?: string;
  variant?: "dark" | "light";
  showTagline?: boolean;
}) {
  const wordColor = variant === "light" ? "text-slate-deep-foreground" : "text-slate-deep";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Trident className="h-9 w-6 shrink-0 text-brand" />
      <div className="leading-none">
        <div className={cn("text-[0.95rem] font-light tracking-[0.18em]", wordColor)}>SAKTHI</div>
        <div className={cn("text-[1.15rem] font-extrabold tracking-[0.06em]", wordColor)}>
          AUTO
        </div>
        {showTagline ? (
          <div className="mt-1 text-[0.65rem] tracking-wide text-muted-foreground">
            Value Added Engineering
          </div>
        ) : null}
      </div>
    </div>
  );
}
