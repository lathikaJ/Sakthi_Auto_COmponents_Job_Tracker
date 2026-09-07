import { cn } from "@/lib/utils";

export function SakthiLogo({
  className,
  imgClassName,
  showTagline = false,
}: {
  className?: string;
  variant?: "dark" | "light";
  showTagline?: boolean;
  useImage?: boolean;
  imgClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <img
        src="/sakthi-auto-logo.jpg"
        alt="Sakthi Auto"
        className={cn("h-10 w-auto object-contain", imgClassName)}
      />
      {showTagline && (
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Value Added Engineering & Audits
        </span>
      )}
    </div>
  );
}


